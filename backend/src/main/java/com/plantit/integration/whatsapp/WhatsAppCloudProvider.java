package com.plantit.integration.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plantit.config.WhatsAppProperties;
import com.plantit.entity.WhatsAppGroup;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.List;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.whatsapp.enabled", havingValue = "true")
public class WhatsAppCloudProvider implements WhatsAppMessageProvider {
    private final WebClient webClient;
    private final WhatsAppProperties properties;
    private final ObjectMapper objectMapper;
    private static final String API_BASE_URL = "https://graph.facebook.com/v20.0";

    public WhatsAppCloudProvider(WebClient.Builder webClientBuilder, WhatsAppProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.webClient = webClientBuilder
                .baseUrl(API_BASE_URL)
                .defaultHeader("Authorization", "Bearer " + properties.getAccessToken())
                .build();
    }

    @Override
    public void start() {
        if (properties.isEnabled()) {
            log.info("WhatsApp Cloud Provider started. Phone Number ID: {}", properties.getPhoneNumberId());
        }
    }

    @Override
    public void stop() {
        log.info("WhatsApp Cloud Provider stopped");
    }

    @Override
    public boolean isConnected() {
        return properties.isEnabled()
            && properties.getAccessToken() != null
            && !properties.getAccessToken().isBlank()
            && properties.getPhoneNumberId() != null
            && !properties.getPhoneNumberId().isBlank();
    }

    @Override
    public List<WhatsAppGroup> getMonitoredGroups() {
        // In real implementation, fetch from API or database
        return List.of();
    }

    @Override
    public void sendMessage(String destination, String message) {
        if (!isConnected()) {
            log.warn("WhatsApp not connected, message not sent to {}: {}", destination, message);
            return;
        }

        try {
                String payload = buildMessagePayload(destination, message);

            webClient.post()
                    .uri("/{phoneNumberId}/messages", properties.getPhoneNumberId())
                    .header("Content-Type", "application/json")
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .doOnSuccess(response -> log.info("Message sent successfully to {}", destination))
                    .doOnError(error -> log.error("Failed to send message to {}: {}", destination, error.getMessage()))
                    .subscribe();
        } catch (Exception e) {
            log.error("Error sending WhatsApp message", e);
        }
    }

    private String buildMessagePayload(String destination, String messageText) throws Exception {
        com.fasterxml.jackson.databind.node.ObjectNode payload = objectMapper.createObjectNode()
                .put("messaging_product", "whatsapp")
                .put("recipient_type", "individual")
            .put("to", destination)
            .put("type", "text");
        payload.set("text", objectMapper.createObjectNode().put("body", messageText).put("preview_url", false));

        return objectMapper.writeValueAsString(payload);
    }
}

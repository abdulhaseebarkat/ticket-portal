package com.plantit.controller;

import com.plantit.config.WhatsAppProperties;
import com.plantit.dto.whatsapp.WhatsAppWebhookPayload;
import com.plantit.dto.whatsapp.WhatsAppWebhookVerification;
import com.plantit.service.WhatsAppService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/whatsapp/webhook")
@ConditionalOnProperty(name = "app.whatsapp.enabled", havingValue = "true")
public class WhatsAppWebhookController {
    private final WhatsAppService whatsAppService;
    private final WhatsAppProperties properties;

    public WhatsAppWebhookController(WhatsAppService whatsAppService, WhatsAppProperties properties) {
        this.whatsAppService = whatsAppService;
        this.properties = properties;
    }

    /**
     * Webhook verification endpoint (GET)
     * Meta calls this to verify the webhook URL
     */
    @GetMapping
    public ResponseEntity<String> verifyWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.challenge") String challenge,
            @RequestParam("hub.verify_token") String verifyToken) {

        log.info("Webhook verification request received. Mode: {}", mode);

        if ("subscribe".equals(mode) && properties.getWebhookVerifyToken().equals(verifyToken)) {
            log.info("Webhook verified successfully");
            return ResponseEntity.ok(challenge);
        }

        log.warn("Webhook verification failed. Invalid token or mode");
        return ResponseEntity.badRequest().build();
    }

    /**
     * Webhook message receiving endpoint (POST)
     * Meta sends incoming messages here
     */
    @PostMapping
    public ResponseEntity<Void> receiveMessage(@RequestBody WhatsAppWebhookPayload payload) {
        log.info("Webhook message received. Object: {}", payload.getObject());

        if (payload.getEntry() != null) {
            payload.getEntry().forEach(entry ->
                entry.getChanges().forEach(change -> {
                    if ("messages".equals(change.getField())) {
                        processIncomingMessage(change.getValue());
                    } else if ("message_status".equals(change.getField())) {
                        log.debug("Message status update: {}", change.getValue());
                    }
                })
            );
        }

        return ResponseEntity.ok().build();
    }

    private void processIncomingMessage(WhatsAppWebhookPayload.Value value) {
        if (value.getMessages() == null || value.getMessages().isEmpty()) {
            return;
        }

        value.getMessages().forEach(message -> {
            try {
                log.info("Processing message from {}: type={}", message.getFrom(), message.getType());

                String messageText = null;
                if ("text".equals(message.getType()) && message.getText() != null) {
                    messageText = message.getText().getBody();
                } else if ("image".equals(message.getType()) && message.getImage() != null) {
                    messageText = message.getImage().getCaption() != null ? message.getImage().getCaption() : "[Image received]";
                } else if ("document".equals(message.getType()) && message.getDocument() != null) {
                    messageText = "[Document: " + message.getDocument().getFilename() + "]";
                }

                if (messageText != null && !messageText.isBlank()) {
                    // Extract phone number without country code
                    String senderPhone = message.getFrom();
                    String groupId = value.getMetadata() != null ? value.getMetadata().getPhone_number_id() : null;

                    // Process incoming message
                    whatsAppService.processRealIncomingMessage(
                            senderPhone,
                            messageText,
                            message.getId(),
                            groupId
                    );
                }
            } catch (Exception e) {
                log.error("Error processing WhatsApp message", e);
            }
        });
    }
}

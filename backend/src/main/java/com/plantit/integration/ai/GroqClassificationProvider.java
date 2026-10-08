package com.plantit.integration.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.plantit.config.GroqProperties;
import com.plantit.integration.ai.model.ClassificationResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/**
 * Classifies WhatsApp messages with a real language model (via Groq's free,
 * OpenAI-compatible API) instead of MockClassificationProvider's keyword
 * matching - reading intent/negation/context ("I don't have a complaint
 * about the scanner" vs "the scanner is broken") the way a person would,
 * rather than just checking whether a trigger word is present anywhere in
 * the text. Only active when app.classification.provider=groq; otherwise
 * MockClassificationProvider (always present) handles everything.
 *
 * On any failure - network error, timeout, malformed response, rate limit -
 * this falls back to the keyword classifier for that one message rather
 * than dropping it, so a Groq outage degrades to today's behavior instead
 * of losing messages.
 */
@Slf4j
@Component
@Primary
@ConditionalOnProperty(name = "app.classification.provider", havingValue = "groq")
public class GroqClassificationProvider implements ComplaintClassificationProvider {

    private static final String API_URL = "https://api.groq.com/openai/v1/chat/completions";

    private final WebClient webClient;
    private final GroqProperties properties;
    private final ClassificationPromptBuilder promptBuilder;
    private final ClassificationResponseParser responseParser;
    private final ObjectMapper objectMapper;
    private final MockClassificationProvider fallback;

    public GroqClassificationProvider(WebClient.Builder webClientBuilder,
                                       GroqProperties properties,
                                       ClassificationPromptBuilder promptBuilder,
                                       ClassificationResponseParser responseParser,
                                       ObjectMapper objectMapper,
                                       MockClassificationProvider fallback) {
        this.properties = properties;
        this.promptBuilder = promptBuilder;
        this.responseParser = responseParser;
        this.objectMapper = objectMapper;
        this.fallback = fallback;
        this.webClient = webClientBuilder
                .baseUrl(API_URL)
                .defaultHeader("Authorization", "Bearer " + properties.getApiKey())
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Override
    public ClassificationResult classifyMessage(String message) {
        try {
            String body = objectMapper.writeValueAsString(buildRequest(message));
            String responseJson = webClient.post()
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofMillis(properties.getTimeoutMs()));
            return parseClassification(responseJson);
        } catch (Exception e) {
            log.warn("Groq classification failed ({}) - falling back to the keyword classifier for this message", e.toString());
            return fallback.classifyMessage(message);
        }
    }

    private ObjectNode buildRequest(String message) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", properties.getModel());
        root.put("temperature", 0.1);
        root.set("response_format", objectMapper.createObjectNode().put("type", "json_object"));

        var messages = root.putArray("messages");
        messages.addObject().put("role", "system").put("content", promptBuilder.build());
        messages.addObject().put("role", "user").put("content", message == null ? "" : message);
        return root;
    }

    private ClassificationResult parseClassification(String responseJson) throws Exception {
        JsonNode root = objectMapper.readTree(responseJson);
        String content = root.path("choices").get(0).path("message").path("content").asText();
        return responseParser.parse(objectMapper.readTree(content));
    }
}

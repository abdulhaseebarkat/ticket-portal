package com.plantit.integration.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.plantit.config.GeminiProperties;
import com.plantit.integration.ai.model.ClassificationResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/**
 * Same role as GroqClassificationProvider - a real-language-model judge
 * instead of keyword matching - but backed by Google AI Studio's free
 * Gemini API instead of Groq. Added because this account repeatedly hit a
 * "team role" permissions wall in the Groq console that blocked API key
 * creation even on a fresh account/browser; Gemini keys are generated
 * directly under the developer's own Google account with no equivalent
 * team-ownership gate.
 *
 * Only active when app.classification.provider=gemini. Shares its prompt
 * and response parsing with GroqClassificationProvider via
 * ClassificationPromptBuilder/ClassificationResponseParser so the two never
 * drift apart - only how each unwraps its own API's response envelope
 * differs.
 */
@Slf4j
@Component
@Primary
@ConditionalOnProperty(name = "app.classification.provider", havingValue = "gemini")
public class GeminiClassificationProvider implements ComplaintClassificationProvider {

    private static final String API_BASE_URL = "https://generativelanguage.googleapis.com";

    private final WebClient webClient;
    private final GeminiProperties properties;
    private final ClassificationPromptBuilder promptBuilder;
    private final ClassificationResponseParser responseParser;
    private final ObjectMapper objectMapper;
    private final MockClassificationProvider fallback;

    public GeminiClassificationProvider(WebClient.Builder webClientBuilder,
                                         GeminiProperties properties,
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
                .baseUrl(API_BASE_URL)
                .defaultHeader("x-goog-api-key", properties.getApiKey())
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Override
    public ClassificationResult classifyMessage(String message) {
        try {
            String body = objectMapper.writeValueAsString(buildRequest(message));
            String responseJson = webClient.post()
                    .uri("/v1beta/models/{model}:generateContent", properties.getModel())
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofMillis(properties.getTimeoutMs()));
            return parseClassification(responseJson);
        } catch (Exception e) {
            log.warn("Gemini classification failed ({}) - falling back to the keyword classifier for this message", e.toString());
            return fallback.classifyMessage(message);
        }
    }

    private ObjectNode buildRequest(String message) {
        ObjectNode root = objectMapper.createObjectNode();

        ObjectNode systemInstruction = root.putObject("systemInstruction");
        systemInstruction.putArray("parts").addObject().put("text", promptBuilder.build());

        ObjectNode content = root.putArray("contents").addObject();
        content.put("role", "user");
        content.putArray("parts").addObject().put("text", message == null ? "" : message);

        ObjectNode generationConfig = root.putObject("generationConfig");
        generationConfig.put("temperature", 0.1);
        generationConfig.put("responseMimeType", "application/json");

        return root;
    }

    private ClassificationResult parseClassification(String responseJson) throws Exception {
        JsonNode root = objectMapper.readTree(responseJson);
        String content = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        return responseParser.parse(objectMapper.readTree(content));
    }
}

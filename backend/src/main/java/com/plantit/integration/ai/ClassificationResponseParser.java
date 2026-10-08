package com.plantit.integration.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.plantit.integration.ai.model.ClassificationResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Turns the inner JSON object an LLM classifier returns (per the shape
 * ClassificationPromptBuilder asks for) into a ClassificationResult. Shared
 * by every LLM-backed provider - only how each one unwraps its own API
 * envelope to get at that inner JSON string differs.
 */
@Slf4j
@Component
public class ClassificationResponseParser {
    private static final Set<String> VALID_INTENTS = Set.of(
            "NEW_COMPLAINT", "POSSIBLE_COMPLAINT", "IN_PROGRESS", "RESOLUTION_DETECTED", "REOPENED", "IRRELEVANT");
    private static final Set<String> VALID_PRIORITIES = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");

    public ClassificationResult parse(JsonNode result) {
        String intent = result.path("intent").asText("IRRELEVANT");
        if (!VALID_INTENTS.contains(intent)) {
            intent = "IRRELEVANT";
        }
        String priority = result.path("priority").asText("MEDIUM");
        if (!VALID_PRIORITIES.contains(priority)) {
            priority = "MEDIUM";
        }
        String category = result.hasNonNull("category") ? result.get("category").asText() : "Other";
        String equipmentReference = result.hasNonNull("equipmentReference") ? result.get("equipmentReference").asText() : null;
        String locationHint = result.hasNonNull("locationHint") ? result.get("locationHint").asText() : null;
        double confidence = result.path("confidence").asDouble(0.7);
        String reasoning = result.path("reasoning").asText("");

        // isComplaint is derived from intent rather than trusted as a
        // separate model-reported field, so it can never disagree with the
        // intent the rest of the pipeline actually acts on.
        boolean isComplaint = intent.equals("NEW_COMPLAINT") || intent.equals("POSSIBLE_COMPLAINT");

        log.info("AI classified message -> intent={}, category={}, equipment={}, location={}, priority={}, confidence={} ({})",
                intent, category, equipmentReference, locationHint, priority, confidence, reasoning);

        return ClassificationResult.builder()
                .isComplaint(isComplaint)
                .category(category)
                .equipment(category)
                .machine("")
                .equipmentReference(equipmentReference)
                .locationHint(locationHint)
                .intent(intent)
                .priority(priority)
                .confidence(confidence)
                .build();
    }
}

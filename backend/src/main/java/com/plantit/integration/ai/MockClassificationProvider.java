package com.plantit.integration.ai;

import com.plantit.integration.ai.model.ClassificationResult;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class MockClassificationProvider implements ComplaintClassificationProvider {

    // Matches phrases like "machine # 47", "machine no 47", "scanner #12"
    private static final Pattern NUMBERED_EQUIPMENT_PATTERN = Pattern.compile(
            "(?i)(machine|scanner|printer|hmi|pc|computer|switch|monitor)\\s*#?\\s*(no\\.?)?\\s*(\\d+)");
    // Matches short equipment codes like "TB-024", "CURE-04"
    private static final Pattern EQUIPMENT_CODE_PATTERN = Pattern.compile("\\b([A-Z]{2,}-\\d+)\\b");
    // Matches "Zone A" / "Zone B" / "zone c" etc.
    private static final Pattern ZONE_LETTER_PATTERN = Pattern.compile("(?i)\\bzone\\s*([a-d])\\b");

    @Override
    public ClassificationResult classifyMessage(String message) {
        String normalized = message.toLowerCase();
        String category = "Other";
        String equipment = "General";
        String machine = "";
        String equipmentReference = extractEquipmentReference(message);
        String locationHint = extractLocationHint(message, normalized);
        String intent = "NEW_COMPLAINT";
        String priority = "MEDIUM";
        double confidence = 0.82;

        if (normalized.contains("scanner")) {
            category = "Scanner";
            equipment = "Scanner";
            priority = "HIGH";
        }
        if (normalized.contains("hmi")) {
            category = "HMI";
            equipment = "HMI PC";
            priority = "HIGH";
        }
        if (normalized.contains("zebra") || normalized.contains("printer")) {
            category = "Zebra Printer";
            equipment = "Printer";
            priority = "HIGH";
        }
        if (normalized.contains("internet") || normalized.contains("network") || normalized.contains("lan") || normalized.contains("wifi")) {
            category = "Network";
            equipment = "Network";
            priority = "HIGH";
        }
        if (normalized.contains("pc") || normalized.contains("computer") || normalized.contains("windows")) {
            category = "Computer";
            equipment = "PC";
            priority = "MEDIUM";
        }
        if (normalized.contains("check kar raha") || normalized.contains("check kar") || normalized.contains("dekh raha")
                || normalized.contains("working on it") || normalized.contains("looking into") || normalized.contains("looking in to")
                || normalized.contains("on it") || normalized.contains("in progress") || normalized.contains("will be done")
                || normalized.contains("we are checking") || normalized.contains("checking it")) {
            intent = "IN_PROGRESS";
            priority = "HIGH";
            confidence = 0.86;
        }
        if (normalized.contains("working hai") || normalized.contains("ab working hai") || normalized.contains("kaam kar raha") || normalized.contains("kaam kar rha") || normalized.contains("reconnect") || normalized.contains("fix") || normalized.contains("fixed") || normalized.contains("resolved") || normalized.contains("resolve") || normalized.contains("solved") || normalized.contains("solve") || normalized.contains("masla hal") || normalized.contains("issue hal") || normalized.contains("theek ho gaya") || normalized.contains("theek hogaya") || normalized.contains("problem done") || normalized.contains("ok now") || normalized.contains("okay now") || normalized.contains("ok ab") || normalized.contains("okay ab") || normalized.contains("sahi ab") || normalized.contains("theek ab") || normalized.equals("ok") || normalized.equals("okay") || normalized.equals("done")
                || normalized.contains("working fine") || normalized.contains("working now") || normalized.contains("working properly")
                || normalized.contains("all good") || normalized.contains("good now") || normalized.contains("sorted")
                || normalized.contains("back up") || normalized.contains("back online") || normalized.contains("up and running")
                || normalized.contains("issue resolved") || normalized.contains("problem solved") || normalized.equals("resolved.")) {
            intent = "RESOLUTION_DETECTED";
            priority = "MEDIUM";
            confidence = 0.93;
        }
        // Note: plain "not working" is deliberately NOT treated as a reopen signal on
        // its own - that's exactly how a brand new complaint is normally phrased.
        // Only a genuine reopen-specific word (still/again/abhi bhi/phir/dobara)
        // counts.
        if (normalized.contains("abhi bhi") || normalized.contains("still") || normalized.contains("phir") || normalized.contains("dobara")) {
            intent = "REOPENED";
            priority = "HIGH";
            confidence = 0.91;
        }
        if (normalized.contains("urgent") || normalized.contains("production line stopped") || normalized.contains("line stopped") || normalized.contains("main hmi") || normalized.contains("stop")) {
            priority = "CRITICAL";
            confidence = 0.94;
        }

        // Only create new complaints for actual complaints, not status updates
        boolean isComplaintMessage = intent.equals("NEW_COMPLAINT");

        return ClassificationResult.builder()
                .isComplaint(isComplaintMessage)
                .category(category)
                .equipment(equipment)
                .machine(machine)
                .equipmentReference(equipmentReference)
                .locationHint(locationHint)
                .intent(intent)
                .priority(priority)
                .confidence(confidence)
                .build();
    }

    /**
     * Pulls a human-readable equipment/machine label out of free text, e.g.
     * "Curing machine # 47 scanner not working" -> "Machine 47", or
     * "TB-024 ka scanner kaam nahi kar raha" -> "TB-024".
     * Returns null when nothing recognizable is found.
     */
    private String extractEquipmentReference(String message) {
        Matcher codeMatcher = EQUIPMENT_CODE_PATTERN.matcher(message);
        if (codeMatcher.find()) {
            return codeMatcher.group(1).toUpperCase();
        }

        Matcher numberedMatcher = NUMBERED_EQUIPMENT_PATTERN.matcher(message);
        if (numberedMatcher.find()) {
            String kind = numberedMatcher.group(1);
            String number = numberedMatcher.group(3);
            return capitalize(kind) + " " + number;
        }

        return null;
    }

    /**
     * Pulls a plant zone/area out of free text when the message names one
     * explicitly - e.g. "Zone A Machine # 43..." -> "Zone A". Used mainly
     * while multiple zones share a single WhatsApp group during testing;
     * once each zone has its own dedicated group, the group's configured
     * area covers this and messages won't usually need to repeat it.
     * Zone C is the Curing area, so it's normalized to that name rather
     * than kept as a bare letter. Returns null when nothing is mentioned.
     */
    private String extractLocationHint(String message, String normalized) {
        Matcher zoneMatcher = ZONE_LETTER_PATTERN.matcher(message);
        if (zoneMatcher.find()) {
            String letter = zoneMatcher.group(1).toUpperCase();
            return "C".equals(letter) ? "Curing" : "Zone " + letter;
        }
        if (normalized.contains("curing")) {
            return "Curing";
        }
        if (normalized.contains("mixing")) {
            return "Mixing";
        }
        return null;
    }

    private String capitalize(String value) {
        if (value == null || value.isEmpty()) {
            return value;
        }
        return Character.toUpperCase(value.charAt(0)) + value.substring(1).toLowerCase();
    }
}

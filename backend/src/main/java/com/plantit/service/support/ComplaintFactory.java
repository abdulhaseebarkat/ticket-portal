package com.plantit.service.support;

import com.plantit.entity.Category;
import com.plantit.entity.Complaint;
import com.plantit.entity.Employee;
import com.plantit.entity.Equipment;
import com.plantit.entity.Location;
import com.plantit.entity.WhatsAppGroup;
import com.plantit.integration.ai.model.ClassificationResult;
import com.plantit.repository.CategoryRepository;
import com.plantit.repository.ComplaintRepository;
import com.plantit.repository.EquipmentRepository;
import com.plantit.repository.LocationRepository;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.Year;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Builds new Complaint records from a classification result. Shared by
 * every ingestion path (simulator, Meta Cloud webhook, and the WhatsApp
 * group bridge) so complaint numbering, category/equipment resolution and
 * title extraction only live in one place.
 */
@Component
public class ComplaintFactory {
    // Common opening salutations people use before actually describing the
    // problem (often on their own line, e.g. "Dear sir\nTriplex Extruder
    // stopped..."). Matched only at the very start of what's left, so a
    // title never becomes just "Dear sir" while the real complaint sits
    // one line down - and applied in a loop, since some messages stack more
    // than one of these ("Dear sir,\nGood morning,\n...").
    private static final Pattern GREETING_PATTERN = Pattern.compile(
            "(?i)^\\s*(dear\\s+(sir|madam|team|all|support|concerned|it\\s*team)"
                    + "|respected\\s+(sir|madam)"
                    + "|hi|hello|hey"
                    + "|good\\s+(morning|afternoon|evening)"
                    + "|assalam\\s*o\\s*alaikum|assalamualaikum|aoa|salam)"
                    + "[\\s,.:!-]*");

    private final CategoryRepository categoryRepository;
    private final EquipmentRepository equipmentRepository;
    private final ComplaintRepository complaintRepository;
    private final LocationRepository locationRepository;

    public ComplaintFactory(CategoryRepository categoryRepository,
                             EquipmentRepository equipmentRepository,
                             ComplaintRepository complaintRepository,
                             LocationRepository locationRepository) {
        this.categoryRepository = categoryRepository;
        this.equipmentRepository = equipmentRepository;
        this.complaintRepository = complaintRepository;
        this.locationRepository = locationRepository;
    }

    public Complaint createComplaint(ClassificationResult classification,
                                      String messageText,
                                      Employee reporter,
                                      String reporterLabel,
                                      WhatsAppGroup group,
                                      OffsetDateTime now,
                                      String complaintNumberPrefix) {
        Equipment equipment = resolveEquipment(classification);
        Location location = resolveLocation(equipment, group, classification.getLocationHint());

        return Complaint.builder()
                .complaintNumber(generateComplaintNumber(complaintNumberPrefix))
                .title(extractTitle(messageText))
                .description(messageText)
                .category(resolveCategory(classification.getCategory()))
                .equipment(equipment)
                .location(location)
                .equipmentReference(classification.getEquipmentReference())
                .reporter(reporter)
                .reporterName(reporterLabel)
                .source("WhatsApp")
                .whatsappGroup(group)
                .priority(classification.getPriority())
                .status("OPEN")
                .aiConfidence(classification.getConfidence())
                .aiCategory(classification.getCategory())
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public String extractTitle(String message) {
        if (message == null || message.isEmpty()) {
            return "Complaint";
        }
        // Skip a leading greeting (if any) so the title reflects the actual
        // complaint rather than "Dear sir" - but if the message turns out to
        // be nothing BUT a greeting, fall back to the original text rather
        // than producing an empty title.
        String content = stripLeadingGreetings(message);
        if (content.isBlank()) {
            content = message;
        }

        int endIndex = Math.min(content.length(), 80);
        int newlineIndex = content.indexOf('\n');
        if (newlineIndex > 0 && newlineIndex < endIndex) {
            endIndex = newlineIndex;
        } else if (endIndex < content.length()) {
            // Actually truncating at the 80-char limit (not stopped by an
            // earlier newline) - back up to the last word boundary so the
            // title never ends mid-word (e.g. "...not working pl" cutting
            // "please" in half) - both as a heading on its own, and because
            // the frontend derives "what's left to show" by matching this
            // title against the full message.
            int lastSpace = content.lastIndexOf(' ', endIndex);
            if (lastSpace > 0) {
                endIndex = lastSpace;
            }
        }
        return content.substring(0, endIndex).trim();
    }

    /** Strips one or more leading greeting lines/phrases, in order - see GREETING_PATTERN. */
    private String stripLeadingGreetings(String message) {
        String remaining = message;
        Matcher matcher = GREETING_PATTERN.matcher(remaining);
        int guard = 0;
        while (matcher.lookingAt() && guard < 5) {
            remaining = remaining.substring(matcher.end());
            matcher = GREETING_PATTERN.matcher(remaining);
            guard++;
        }
        return remaining.trim();
    }

    /**
     * Resolves which zone/location a new complaint belongs to, in order of
     * how specific the signal is:
     *   1. A zone explicitly named in the message itself (e.g. "Zone A...")
     *      - needed while multiple zones still share one WhatsApp group.
     *   2. The specific equipment's registered location, if matched.
     *   3. The WhatsApp group's configured area - once each zone has its
     *      own dedicated group, this alone is enough.
     * Creates the Location on first use if it doesn't exist yet.
     */
    private Location resolveLocation(Equipment equipment, WhatsAppGroup group, String locationHint) {
        if (locationHint != null && !locationHint.isBlank()) {
            return findOrCreateLocation(locationHint);
        }
        if (equipment != null && equipment.getLocation() != null) {
            return equipment.getLocation();
        }
        if (group != null && group.getArea() != null && !group.getArea().isBlank()) {
            return findOrCreateLocation(group.getArea());
        }
        return null;
    }

    private Location findOrCreateLocation(String name) {
        return locationRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> locationRepository.save(Location.builder()
                        .name(name)
                        .plantArea(name)
                        .active(true)
                        .build()));
    }

    private Category resolveCategory(String categoryName) {
        return categoryRepository.findAll().stream()
                .filter(item -> item.getName().equalsIgnoreCase(categoryName))
                .findFirst()
                .orElseGet(() -> categoryRepository.findAll().stream()
                        .filter(item -> item.getName().equalsIgnoreCase("Other"))
                        .findFirst()
                        .orElse(null));
    }

    private Equipment resolveEquipment(ClassificationResult classification) {
        String reference = classification.getEquipmentReference();
        if (reference != null && !reference.isBlank()) {
            Equipment byReference = equipmentRepository.findAll().stream()
                    .filter(item -> matchesReference(item, reference))
                    .findFirst()
                    .orElse(null);
            if (byReference != null) {
                return byReference;
            }
        }
        return equipmentRepository.findAll().stream()
                .filter(item -> item.getType() != null && item.getType().equalsIgnoreCase(classification.getEquipment()))
                .findFirst()
                .orElse(null);
    }

    private boolean matchesReference(Equipment equipment, String reference) {
        String cleanedRef = normalize(reference);
        if (cleanedRef.isEmpty()) {
            return false;
        }
        String code = normalize(equipment.getEquipmentCode());
        String name = normalize(equipment.getName());
        boolean codeMatches = !code.isEmpty() && (code.contains(cleanedRef) || cleanedRef.contains(code));
        boolean nameMatches = !name.isEmpty() && name.contains(cleanedRef);
        return codeMatches || nameMatches;
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase().replace(" ", "").replace("-", "");
    }

    /**
     * Generates a complaint number guaranteed unique, replacing the previous
     * "prefix + currentTimeMillis % 1_000_000" scheme, which could collide
     * under rapid/simulated traffic (complaint_number has a unique DB
     * constraint).
     */
    private String generateComplaintNumber(String prefix) {
        String base = prefix + Year.now().getValue() + "-";
        long sequence = complaintRepository.count() + 1;
        String candidate;
        do {
            candidate = base + String.format("%04d", sequence++);
        } while (complaintRepository.findByComplaintNumber(candidate).isPresent());
        return candidate;
    }
}

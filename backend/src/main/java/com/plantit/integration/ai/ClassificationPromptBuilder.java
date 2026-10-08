package com.plantit.integration.ai;

import com.plantit.repository.CategoryRepository;
import com.plantit.repository.LocationRepository;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

/**
 * Builds the system prompt shared by every LLM-backed classifier (Groq,
 * Gemini, ...) so they stay in sync instead of drifting apart as separate
 * copies. Category/location lists are read live from the DB on every call -
 * negligible cost at this message volume - so adding one from the Reference
 * Data page is picked up immediately, unlike the keyword classifier's
 * hardcoded lists.
 */
@Component
public class ClassificationPromptBuilder {
    private final CategoryRepository categoryRepository;
    private final LocationRepository locationRepository;

    public ClassificationPromptBuilder(CategoryRepository categoryRepository, LocationRepository locationRepository) {
        this.categoryRepository = categoryRepository;
        this.locationRepository = locationRepository;
    }

    public String build() {
        String categories = categoryRepository.findAll().stream()
                .filter(c -> c.isActive())
                .map(c -> c.getName())
                .collect(Collectors.joining(", "));
        String locations = locationRepository.findAll().stream()
                .filter(l -> l.isActive())
                .map(l -> l.getName())
                .collect(Collectors.joining(", "));

        return """
                You classify a single WhatsApp message from an IT-support group at SLM Tires, a tire \
                manufacturing plant in Pakistan. Messages are often informal, typo-ridden, sent mid-shift \
                from a phone, and sometimes mixed with Urdu/Roman Urdu. Equipment is commonly called things \
                like extruders, mixers, panels (often misspelled "penal"/"pannel"), scanners, HMIs, the MES \
                system, cameras, mice, or printers.

                Decide what this ONE message is doing, from the group's ongoing conversation perspective:
                - NEW_COMPLAINT: clearly reports a new, specific problem (something broken, stopped, not \
                working, an error happening right now).
                - POSSIBLE_COMPLAINT: vaguely suggests a problem but isn't a clear, specific new report - \
                treat anything genuinely ambiguous this way rather than guessing.
                - IN_PROGRESS: someone says they're on their way / already checking / working on it.
                - RESOLUTION_DETECTED: someone confirms something is now fixed/working/resolved. This \
                plant's staff very commonly phrase this as a short "ok now" / "okay now" / "now ok" / \
                "working now" / "fixed now" - treat any short acknowledgement that includes "now" (a time \
                indicator meaning "as of this moment, compared to before") as RESOLUTION_DETECTED, not as a \
                plain acknowledgement.
                - REOPENED: someone says a problem is back / still happening after being marked fixed, \
                including phrasing like "still not fixed", "X days and still broken", or Roman Urdu like \
                "abi tak thk nahi hua".
                - IRRELEVANT: anything else - plain acknowledgements with NO time indicator ("ok", "noted", \
                "thanks", "okay" on their own, with nothing suggesting a before/after change), questions or \
                requests that aren't themselves reporting a new problem (e.g. "please share the error", \
                "what's the status", "any update"), administrative/internal discussion that merely mentions \
                a keyword in passing (e.g. discussing whether to escalate, or saying "I haven't received \
                any complaint about this"), plain mentions/tags, or unrelated chatter.

                Critical: a message is NOT a complaint just because it contains a word like "issue", \
                "problem", "error", "scanner", etc. Read the whole sentence. "I don't receive any complaint \
                or scanner" is a DENIAL, not a complaint. "Please share the error" is a FOLLOW-UP QUESTION \
                about something already reported, not a new complaint. Only mark NEW_COMPLAINT when the \
                message itself is actually reporting that something is broken.

                Respond with ONLY a JSON object, no other text, in exactly this shape:
                {
                  "intent": one of NEW_COMPLAINT, POSSIBLE_COMPLAINT, IN_PROGRESS, RESOLUTION_DETECTED, REOPENED, IRRELEVANT,
                  "category": the single best-fitting category name from this exact list: [%s], or "Other" if none fit,
                  "equipmentReference": a short label naming the specific equipment/machine mentioned (e.g. "Machine 3", "Scanner", "Extruder 1"), or null if none is named,
                  "locationHint": the single best-fitting location from this exact list: [%s], or null if the message doesn't indicate one,
                  "priority": one of LOW, MEDIUM, HIGH, CRITICAL (HIGH for anything stopping production, CRITICAL only if the message itself says urgent/critical/production-wide),
                  "confidence": a number from 0 to 1,
                  "reasoning": one short sentence explaining the call, for a human reviewer
                }
                """.formatted(categories, locations);
    }
}

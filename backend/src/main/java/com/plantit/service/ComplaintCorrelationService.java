package com.plantit.service;

import com.plantit.entity.Complaint;
import com.plantit.entity.WhatsAppGroup;

import java.util.Optional;

/**
 * Figures out which existing Complaint a follow-up WhatsApp message (a
 * status update, resolution note, or reopen) refers to. Used whenever a
 * message doesn't read as a brand-new complaint.
 */
public interface ComplaintCorrelationService {

    /**
     * Strongest signal: the sender used WhatsApp's native "reply" feature on
     * the original complaint message. Looks up the quoted message by its
     * WhatsApp id and follows it to the Complaint it belongs to.
     */
    Optional<Complaint> resolveByQuotedMessage(String quotedExternalMessageId);

    /**
     * Fallback signal, used when there's no quoted reply: tries to match an
     * extracted equipment/machine reference against open complaints in the
     * same group, then a mentioned zone/location, then the classified
     * category, then simply the most recently opened complaint in the
     * group as a last resort (covers generic replies like "fixed" or
     * "done" with no identifying keyword).
     */
    Optional<Complaint> resolveByContext(WhatsAppGroup group, String equipmentReference, String locationHint, String category);
}

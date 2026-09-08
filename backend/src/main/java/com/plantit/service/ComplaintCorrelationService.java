package com.plantit.service;

import com.plantit.entity.Complaint;
import com.plantit.entity.WhatsAppGroup;

import java.time.OffsetDateTime;
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

    /**
     * A message with an explicit reopen signal ("still not working", "abhi
     * bhi kharab hai") that isn't a reply and doesn't match any currently
     * open complaint deserves one more, narrower check before it's treated
     * as a brand new report: was this exact equipment marked resolved
     * recently? Deliberately narrower than resolveByContext - only the
     * equipment reference is trusted here (not zone/category, which are too
     * broad to safely match against already-closed complaints), and only
     * within a short recency window, so an unrelated old resolved complaint
     * that merely shares a category can never get wrongly reopened.
     */
    Optional<Complaint> resolveRecentlyResolvedByEquipment(WhatsAppGroup group, String equipmentReference, OffsetDateTime referenceTime);
}

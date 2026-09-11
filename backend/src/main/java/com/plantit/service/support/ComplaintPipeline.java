package com.plantit.service.support;

import com.plantit.entity.Complaint;
import com.plantit.entity.ComplaintEvent;
import com.plantit.entity.ComplaintMessage;
import com.plantit.integration.ai.model.ClassificationResult;
import com.plantit.repository.ComplaintEventRepository;
import com.plantit.repository.ComplaintMessageRepository;
import com.plantit.repository.ComplaintRepository;
import com.plantit.service.ComplaintCorrelationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * The single place where a classified WhatsApp message turns into either a
 * new Complaint or an update to an existing one, with a full
 * ComplaintEvent/ComplaintMessage history. Shared by the WhatsApp Simulator,
 * the Meta Cloud webhook, and the WhatsApp group bridge.
 */
@Component
public class ComplaintPipeline {
    private static final Logger log = LoggerFactory.getLogger(ComplaintPipeline.class);

    private final ComplaintCorrelationService correlationService;
    private final ComplaintFactory complaintFactory;
    private final ComplaintRepository complaintRepository;
    private final ComplaintEventRepository complaintEventRepository;
    private final ComplaintMessageRepository complaintMessageRepository;

    public ComplaintPipeline(ComplaintCorrelationService correlationService,
                              ComplaintFactory complaintFactory,
                              ComplaintRepository complaintRepository,
                              ComplaintEventRepository complaintEventRepository,
                              ComplaintMessageRepository complaintMessageRepository) {
        this.correlationService = correlationService;
        this.complaintFactory = complaintFactory;
        this.complaintRepository = complaintRepository;
        this.complaintEventRepository = complaintEventRepository;
        this.complaintMessageRepository = complaintMessageRepository;
    }

    public Optional<Complaint> apply(IngestionContext ctx) {
        ClassificationResult classification = ctx.getClassification();

        // A native WhatsApp "reply" to the original complaint message is the
        // strongest possible signal for which complaint this concerns - it
        // wins even if the classifier's keyword matching thought this looked
        // like a brand new complaint (e.g. a generic "OK Now" reply).
        Optional<Complaint> target = correlationService.resolveByQuotedMessage(ctx.getQuotedExternalMessageId());

        // Casual chatter with no IT-complaint signal at all, and not a reply
        // to any existing complaint thread, has nothing to do with any
        // complaint - stop here rather than letting resolveByContext's
        // generic-reply fallback wrongly attach it to whatever else happens
        // to be open (the raw message is still stored for audit either way).
        if (target.isEmpty() && "IRRELEVANT".equals(classification.getIntent())) {
            return Optional.empty();
        }

        if (target.isEmpty() && !classification.isComplaint()) {
            target = correlationService.resolveByContext(
                    ctx.getGroup(), classification.getEquipmentReference(), classification.getLocationHint(), classification.getCategory());
        }

        // An explicit reopen signal ("still not working") with nothing
        // currently open to attach to gets one more, narrower chance: the
        // same equipment, recently marked resolved. Deliberately not
        // extended to resolveByContext's broader zone/category tiers - only
        // an equipment code is specific enough to trust against an already
        // closed complaint.
        if (target.isEmpty() && "REOPENED".equals(classification.getIntent())) {
            target = correlationService.resolveRecentlyResolvedByEquipment(
                    ctx.getGroup(), classification.getEquipmentReference(), ctx.getNow());
        }

        if (target.isPresent()) {
            Complaint complaint = target.get();
            linkMessage(complaint, ctx);
            applyStatusUpdate(complaint, ctx);
            return Optional.of(complaint);
        }

        // A "still broken"/"abhi bhi" reopen signal that isn't a reply and
        // doesn't match any currently-open complaint (e.g. the original was
        // already resolved, or falls outside a bounded history backfill
        // window) is still a real, actionable report - it shouldn't vanish
        // silently just because there's nothing left open to attach it to.
        // Treat it the same as a fresh complaint rather than dropping it.
        if (classification.isComplaint() || "REOPENED".equals(classification.getIntent())) {
            Complaint complaint = complaintRepository.save(complaintFactory.createComplaint(
                    classification, ctx.getMessageText(), ctx.getSender(), ctx.getSenderLabel(), ctx.getGroup(), ctx.getNow(), ctx.getComplaintNumberPrefix()));
            linkMessage(complaint, ctx);
            recordEvent(complaint, "CREATED", null, "OPEN", ctx);
            return Optional.of(complaint);
        }

        log.warn("No active complaint matched WhatsApp message: {}", ctx.getMessageText());
        return Optional.empty();
    }

    private void linkMessage(Complaint complaint, IngestionContext ctx) {
        if (ctx.getWhatsAppMessage() == null) {
            return;
        }
        complaintMessageRepository.save(ComplaintMessage.builder()
                .complaint(complaint)
                .whatsappMessage(ctx.getWhatsAppMessage())
                .messageRole(ctx.isSupportStaff() ? "IT_REPLY" : "REPORTER")
                .createdAt(ctx.getNow())
                .build());
    }

    private void applyStatusUpdate(Complaint complaint, IngestionContext ctx) {
        String oldStatus = complaint.getStatus();
        String intent = ctx.getClassification().getIntent();
        String newStatus = null;

        if ("IN_PROGRESS".equals(intent)) {
            complaint.setStatus("IN_PROGRESS");
            newStatus = "IN_PROGRESS";
        } else if ("RESOLUTION_DETECTED".equals(intent)) {
            complaint.setStatus("RESOLVED");
            complaint.setResolvedAt(ctx.getNow());
            complaint.setResolvedBy(ctx.getSenderLabel());
            newStatus = "RESOLVED";
        } else if ("REOPENED".equals(intent)) {
            complaint.setStatus("REOPENED");
            complaint.setResolvedAt(null);
            complaint.setResolvedBy(null);
            newStatus = "REOPENED";
        }

        complaint.setUpdatedAt(ctx.getNow());
        complaintRepository.save(complaint);

        if (newStatus != null) {
            log.info("Complaint {} updated to {} from WhatsApp message", complaint.getComplaintNumber(), newStatus);
            recordEvent(complaint, "STATUS_CHANGE", oldStatus, newStatus, ctx);
        } else {
            // Correlated to a complaint, but no clear status keyword (e.g. a
            // plain "OK Now" reply-to) - still worth keeping on the timeline.
            recordEvent(complaint, "COMMENT", oldStatus, oldStatus, ctx);
        }
    }

    private void recordEvent(Complaint complaint, String eventType, String oldValue, String newValue, IngestionContext ctx) {
        complaintEventRepository.save(ComplaintEvent.builder()
                .complaint(complaint)
                .eventType(eventType)
                .oldValue(oldValue)
                .newValue(newValue)
                .description(ctx.getMessageText())
                .performedBy(ctx.getSenderLabel())
                .createdAt(ctx.getNow())
                .build());
    }
}

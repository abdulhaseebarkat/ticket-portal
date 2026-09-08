package com.plantit.service.impl;

import com.plantit.entity.Complaint;
import com.plantit.entity.ComplaintMessage;
import com.plantit.entity.WhatsAppGroup;
import com.plantit.repository.ComplaintMessageRepository;
import com.plantit.repository.ComplaintRepository;
import com.plantit.repository.WhatsAppMessageRepository;
import com.plantit.service.ComplaintCorrelationService;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class ComplaintCorrelationServiceImpl implements ComplaintCorrelationService {
    /**
     * How far back a reopen signal ("still broken") is allowed to reach for
     * a resolved complaint on the same equipment. Short and deliberate: a
     * scanner marked fixed 2 hours ago and reported broken again is almost
     * certainly the same issue; one "fixed" a month ago almost certainly
     * isn't, and should surface as its own new complaint instead.
     */
    private static final long RECENT_RESOLUTION_LOOKBACK_HOURS = 72;

    private final ComplaintRepository complaintRepository;
    private final WhatsAppMessageRepository whatsAppMessageRepository;
    private final ComplaintMessageRepository complaintMessageRepository;

    public ComplaintCorrelationServiceImpl(ComplaintRepository complaintRepository,
                                            WhatsAppMessageRepository whatsAppMessageRepository,
                                            ComplaintMessageRepository complaintMessageRepository) {
        this.complaintRepository = complaintRepository;
        this.whatsAppMessageRepository = whatsAppMessageRepository;
        this.complaintMessageRepository = complaintMessageRepository;
    }

    @Override
    public Optional<Complaint> resolveByQuotedMessage(String quotedExternalMessageId) {
        if (quotedExternalMessageId == null || quotedExternalMessageId.isBlank()) {
            return Optional.empty();
        }
        return whatsAppMessageRepository.findByExternalMessageId(quotedExternalMessageId)
                .flatMap(original -> complaintMessageRepository.findByWhatsappMessageId(original.getId()))
                .map(ComplaintMessage::getComplaint);
    }

    @Override
    public Optional<Complaint> resolveByContext(WhatsAppGroup group, String equipmentReference, String locationHint, String category) {
        List<Complaint> openComplaints = complaintRepository.findAll().stream()
                .filter(complaint -> group.equals(complaint.getWhatsappGroup()))
                .filter(complaint -> !"RESOLVED".equalsIgnoreCase(complaint.getStatus()))
                .filter(complaint -> !"CLOSED".equalsIgnoreCase(complaint.getStatus()))
                .toList();

        boolean hasEquipmentSignal = equipmentReference != null && !equipmentReference.isBlank();
        boolean hasLocationSignal = locationHint != null && !locationHint.isBlank();
        // "Other" is the classifier's catch-all default for anything it can't
        // recognize - both genuinely uncategorized complaints AND generic
        // replies with no identifying keyword end up there, so it doesn't
        // count as a real signal either way.
        boolean hasCategorySignal = category != null && !category.isBlank() && !"Other".equalsIgnoreCase(category);

        if (hasEquipmentSignal) {
            Optional<Complaint> byEquipment = openComplaints.stream()
                    .filter(complaint -> matchesEquipmentReference(complaint, equipmentReference))
                    .max(Comparator.comparing(Complaint::getCreatedAt));
            if (byEquipment.isPresent()) {
                return byEquipment;
            }
        }

        if (hasLocationSignal) {
            Optional<Complaint> byLocation = openComplaints.stream()
                    .filter(complaint -> complaint.getLocation() != null && locationHint.equalsIgnoreCase(complaint.getLocation().getName()))
                    .max(Comparator.comparing(Complaint::getCreatedAt));
            if (byLocation.isPresent()) {
                return byLocation;
            }
        }

        if (hasCategorySignal) {
            Optional<Complaint> byCategory = openComplaints.stream()
                    .filter(complaint -> category.equalsIgnoreCase(complaint.getAiCategory()))
                    .max(Comparator.comparing(Complaint::getCreatedAt));
            if (byCategory.isPresent()) {
                return byCategory;
            }
        }

        // Last resort: the single most recently opened issue in this group,
        // regardless of category - but ONLY when the message carried no
        // identifying signal at all (a bare "fixed"/"done"/"ok"). If it DID
        // name specific equipment, a zone, or a real category and that
        // didn't match anything open, that's evidence this is about
        // something else entirely - falling through here would wrongly
        // merge an unrelated report into whatever else happens to be open.
        if (hasEquipmentSignal || hasLocationSignal || hasCategorySignal) {
            return Optional.empty();
        }
        return openComplaints.stream().max(Comparator.comparing(Complaint::getCreatedAt));
    }

    @Override
    public Optional<Complaint> resolveRecentlyResolvedByEquipment(WhatsAppGroup group, String equipmentReference, OffsetDateTime referenceTime) {
        if (equipmentReference == null || equipmentReference.isBlank()) {
            return Optional.empty();
        }
        OffsetDateTime cutoff = referenceTime.minusHours(RECENT_RESOLUTION_LOOKBACK_HOURS);
        return complaintRepository.findAll().stream()
                .filter(complaint -> group.equals(complaint.getWhatsappGroup()))
                .filter(complaint -> "RESOLVED".equalsIgnoreCase(complaint.getStatus()) || "CLOSED".equalsIgnoreCase(complaint.getStatus()))
                .filter(complaint -> complaint.getResolvedAt() != null && complaint.getResolvedAt().isAfter(cutoff))
                .filter(complaint -> matchesEquipmentReference(complaint, equipmentReference))
                .max(Comparator.comparing(Complaint::getResolvedAt));
    }

    private boolean matchesEquipmentReference(Complaint complaint, String reference) {
        String cleanedRef = normalize(reference);
        if (cleanedRef.isEmpty()) {
            return false;
        }
        String existingRef = normalize(complaint.getEquipmentReference());
        if (!existingRef.isEmpty() && (existingRef.contains(cleanedRef) || cleanedRef.contains(existingRef))) {
            return true;
        }
        if (complaint.getEquipment() != null) {
            String code = normalize(complaint.getEquipment().getEquipmentCode());
            String name = normalize(complaint.getEquipment().getName());
            return (!code.isEmpty() && (code.contains(cleanedRef) || cleanedRef.contains(code)))
                    || (!name.isEmpty() && name.contains(cleanedRef));
        }
        return false;
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase().replace(" ", "").replace("-", "");
    }
}

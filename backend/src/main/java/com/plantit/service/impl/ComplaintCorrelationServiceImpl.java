package com.plantit.service.impl;

import com.plantit.entity.Complaint;
import com.plantit.entity.ComplaintMessage;
import com.plantit.entity.WhatsAppGroup;
import com.plantit.repository.ComplaintMessageRepository;
import com.plantit.repository.ComplaintRepository;
import com.plantit.repository.WhatsAppMessageRepository;
import com.plantit.service.ComplaintCorrelationService;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class ComplaintCorrelationServiceImpl implements ComplaintCorrelationService {
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

        if (equipmentReference != null && !equipmentReference.isBlank()) {
            Optional<Complaint> byEquipment = openComplaints.stream()
                    .filter(complaint -> matchesEquipmentReference(complaint, equipmentReference))
                    .max(Comparator.comparing(Complaint::getCreatedAt));
            if (byEquipment.isPresent()) {
                return byEquipment;
            }
        }

        if (locationHint != null && !locationHint.isBlank()) {
            Optional<Complaint> byLocation = openComplaints.stream()
                    .filter(complaint -> complaint.getLocation() != null && locationHint.equalsIgnoreCase(complaint.getLocation().getName()))
                    .max(Comparator.comparing(Complaint::getCreatedAt));
            if (byLocation.isPresent()) {
                return byLocation;
            }
        }

        // "Other" is the classifier's catch-all default for anything it can't
        // recognize - both genuinely uncategorized complaints AND generic
        // replies with no identifying keyword end up there. Matching on it
        // isn't a real signal (it can wrongly grab an unrelated complaint
        // that merely also defaulted to "Other"), so it's excluded here.
        if (category != null && !category.isBlank() && !"Other".equalsIgnoreCase(category)) {
            Optional<Complaint> byCategory = openComplaints.stream()
                    .filter(complaint -> category.equalsIgnoreCase(complaint.getAiCategory()))
                    .max(Comparator.comparing(Complaint::getCreatedAt));
            if (byCategory.isPresent()) {
                return byCategory;
            }
        }

        // Last resort: the single most recently opened issue in this group,
        // regardless of category - covers generic replies like "fixed" or
        // "done" that carry no identifying keyword at all.
        return openComplaints.stream().max(Comparator.comparing(Complaint::getCreatedAt));
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

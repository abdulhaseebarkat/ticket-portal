package com.plantit.service.impl;

import com.plantit.dto.ComplaintDetailDto;
import com.plantit.dto.ComplaintEventDto;
import com.plantit.dto.ComplaintSummaryDto;
import com.plantit.entity.Complaint;
import com.plantit.entity.ComplaintMessage;
import com.plantit.entity.WhatsAppMessage;
import com.plantit.repository.ComplaintEventRepository;
import com.plantit.repository.ComplaintMessageRepository;
import com.plantit.repository.ComplaintRepository;
import com.plantit.service.ComplaintService;
import com.plantit.service.support.ComplaintSummaryMapper;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
public class ComplaintServiceImpl implements ComplaintService {
    private final ComplaintRepository complaintRepository;
    private final ComplaintEventRepository complaintEventRepository;
    private final ComplaintMessageRepository complaintMessageRepository;
    private final ComplaintSummaryMapper complaintSummaryMapper;

    public ComplaintServiceImpl(ComplaintRepository complaintRepository,
                                 ComplaintEventRepository complaintEventRepository,
                                 ComplaintMessageRepository complaintMessageRepository,
                                 ComplaintSummaryMapper complaintSummaryMapper) {
        this.complaintRepository = complaintRepository;
        this.complaintEventRepository = complaintEventRepository;
        this.complaintMessageRepository = complaintMessageRepository;
        this.complaintSummaryMapper = complaintSummaryMapper;
    }

    @Override
    public List<ComplaintSummaryDto> listAll() {
        return complaintRepository.findAll().stream()
                .sorted(Comparator.comparing(Complaint::getCreatedAt).reversed())
                .map(complaintSummaryMapper::toSummary)
                .toList();
    }

    @Override
    public ComplaintDetailDto getDetail(Long id) {
        Complaint complaint = complaintRepository.findById(id).orElseThrow();

        List<ComplaintEventDto> events = complaintEventRepository.findByComplaintIdOrderByCreatedAtDesc(id).stream()
                .map(event -> ComplaintEventDto.builder()
                        .eventType(event.getEventType())
                        .oldValue(event.getOldValue())
                        .newValue(event.getNewValue())
                        .description(event.getDescription())
                        .performedBy(event.getPerformedBy())
                        .createdAt(event.getCreatedAt())
                        .build())
                .toList();

        List<String> imageUrls = complaintMessageRepository.findByComplaintIdOrderByCreatedAtAsc(id).stream()
                .map(ComplaintMessage::getWhatsappMessage)
                .filter(Objects::nonNull)
                .map(WhatsAppMessage::getMediaUrl)
                .filter(url -> url != null && !url.isBlank())
                .distinct()
                .toList();

        return ComplaintDetailDto.builder()
                .id(complaint.getId())
                .complaintNumber(complaint.getComplaintNumber())
                .title(complaint.getTitle())
                .description(complaint.getDescription())
                .source(complaint.getSource())
                .priority(complaint.getPriority())
                .status(complaint.getStatus())
                .category(complaint.getAiCategory())
                .equipment(complaint.getEquipment() == null ? null : complaint.getEquipment().getName())
                .equipmentReference(complaint.getEquipmentReference())
                .location(complaint.getLocation() == null ? null : complaint.getLocation().getName())
                .reporter(complaint.getReporter() == null ? null : complaint.getReporter().getName())
                .group(complaint.getWhatsappGroup() == null ? null : complaint.getWhatsappGroup().getName())
                .confidence(complaint.getAiConfidence())
                .createdAt(complaint.getCreatedAt())
                .resolvedAt(complaint.getResolvedAt())
                .imageUrls(imageUrls)
                .events(events)
                .build();
    }
}

package com.plantit.service.support;

import com.plantit.dto.ComplaintSummaryDto;
import com.plantit.entity.Complaint;
import org.springframework.stereotype.Component;

/**
 * Shared Complaint -> ComplaintSummaryDto mapping, used by both the
 * dashboard's recent-activity feed and the full complaints listing so the
 * two views never drift apart.
 */
@Component
public class ComplaintSummaryMapper {
    public ComplaintSummaryDto toSummary(Complaint complaint) {
        return ComplaintSummaryDto.builder()
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
                .build();
    }
}

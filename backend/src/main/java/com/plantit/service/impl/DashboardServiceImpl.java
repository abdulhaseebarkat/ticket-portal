package com.plantit.service.impl;

import com.plantit.dto.DashboardSummaryDto;
import com.plantit.repository.ComplaintRepository;
import com.plantit.service.DashboardService;
import com.plantit.service.support.ComplaintSummaryMapper;
import org.springframework.stereotype.Service;
import com.plantit.entity.Complaint;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;

@Service
public class DashboardServiceImpl implements DashboardService {
    private final ComplaintRepository complaintRepository;
    private final ComplaintSummaryMapper complaintSummaryMapper;

    public DashboardServiceImpl(ComplaintRepository complaintRepository, ComplaintSummaryMapper complaintSummaryMapper) {
        this.complaintRepository = complaintRepository;
        this.complaintSummaryMapper = complaintSummaryMapper;
    }

    @Override
    public DashboardSummaryDto getSummary() {
        List<Complaint> complaints = complaintRepository.findAll();
        int total = complaints.size();
        int open = countStatus(complaints, "OPEN");
        int inProgress = countStatus(complaints, "IN_PROGRESS");
        int resolvedToday = (int) complaints.stream()
            .filter(complaint -> complaint.getResolvedAt() != null)
            .filter(complaint -> complaint.getResolvedAt().toLocalDate().equals(LocalDate.now()))
            .count();
        int critical = (int) complaints.stream()
            .filter(complaint -> "CRITICAL".equalsIgnoreCase(complaint.getPriority()))
            .filter(complaint -> !"RESOLVED".equalsIgnoreCase(complaint.getStatus()))
            .count();

        return DashboardSummaryDto.builder()
                .whatsappComplaints(total)
                .openComplaints(open)
                .inProgressComplaints(inProgress)
                .resolvedToday(resolvedToday)
                .criticalIssues(critical)
                .averageResolutionTime(computeAverageResolutionTime(complaints))
                .complaints(complaintRepository.findTop20ByOrderByCreatedAtDesc().stream()
                        .map(complaintSummaryMapper::toSummary)
                        .toList())
                .build();
    }

    private int countStatus(List<Complaint> complaints, String status) {
        return (int) complaints.stream()
                .filter(complaint -> status.equalsIgnoreCase(complaint.getStatus()))
                .count();
    }

    /**
     * Real average time from a complaint being reported to it being marked
     * resolved, across every resolved complaint on record - replaces the
     * previous hardcoded "Live" placeholder.
     */
    private String computeAverageResolutionTime(List<Complaint> complaints) {
        List<Long> resolutionMinutes = complaints.stream()
                .filter(complaint -> complaint.getResolvedAt() != null)
                .map(complaint -> Duration.between(complaint.getCreatedAt(), complaint.getResolvedAt()).toMinutes())
                .filter(minutes -> minutes >= 0)
                .toList();

        if (resolutionMinutes.isEmpty()) {
            return "No data yet";
        }

        long averageMinutes = Math.round(resolutionMinutes.stream().mapToLong(Long::longValue).average().orElse(0));
        return formatMinutes(averageMinutes);
    }

    private String formatMinutes(long minutes) {
        if (minutes < 60) {
            return minutes + "m";
        }
        long hours = minutes / 60;
        long remainingMinutes = minutes % 60;
        if (hours < 24) {
            return remainingMinutes == 0 ? hours + "h" : hours + "h " + remainingMinutes + "m";
        }
        long days = hours / 24;
        long remainingHours = hours % 24;
        return remainingHours == 0 ? days + "d" : days + "d " + remainingHours + "h";
    }
}

package com.plantit.service.impl;

import com.plantit.dto.DashboardSummaryDto;
import com.plantit.repository.ComplaintRepository;
import com.plantit.service.DashboardService;
import com.plantit.service.support.ComplaintSummaryMapper;
import org.springframework.stereotype.Service;
import com.plantit.entity.Complaint;
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
        // CLOSED is just as done as RESOLVED - a closed critical complaint
        // is no longer an "unresolved critical issue" either, even if it
        // was closed directly without ever passing through RESOLVED.
        int critical = (int) complaints.stream()
            .filter(complaint -> "CRITICAL".equalsIgnoreCase(complaint.getPriority()))
            .filter(complaint -> !"RESOLVED".equalsIgnoreCase(complaint.getStatus()))
            .filter(complaint -> !"CLOSED".equalsIgnoreCase(complaint.getStatus()))
            .count();

        return DashboardSummaryDto.builder()
                .whatsappComplaints(total)
                .openComplaints(open)
                .inProgressComplaints(inProgress)
                .resolvedToday(resolvedToday)
                .criticalIssues(critical)
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
}

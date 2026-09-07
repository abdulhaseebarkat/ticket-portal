package com.plantit.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryDto {
    private int whatsappComplaints;
    private int openComplaints;
    private int inProgressComplaints;
    private int resolvedToday;
    private int criticalIssues;
    private String averageResolutionTime;
    private List<ComplaintSummaryDto> complaints;
}

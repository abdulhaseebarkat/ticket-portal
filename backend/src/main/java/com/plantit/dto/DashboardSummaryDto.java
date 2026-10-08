package com.plantit.dto;

import lombok.*;
import java.util.List;
import java.util.Map;

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
    private List<ComplaintSummaryDto> complaints;
    // Raw resolvedBy -> count, over ALL resolved/closed complaints (not
    // just the 20 most recent in `complaints` above) - the frontend buckets
    // these into named staff members itself, since who counts as which
    // person is a product decision that changes more often than this API.
    private Map<String, Long> resolutionsByResolver;
}

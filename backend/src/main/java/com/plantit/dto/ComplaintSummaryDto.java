package com.plantit.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class ComplaintSummaryDto {
    private Long id;
    private String complaintNumber;
    private String title;
    private String description;
    private String source;
    private String priority;
    private String status;
    private String category;
    private String equipment;
    private String equipmentReference;
    private String location;
    private String reporter;
    private String group;
    private Double confidence;
    private OffsetDateTime createdAt;
    private OffsetDateTime resolvedAt;
}
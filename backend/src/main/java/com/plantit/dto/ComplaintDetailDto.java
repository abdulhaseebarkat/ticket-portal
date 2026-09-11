package com.plantit.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Builder
public class ComplaintDetailDto {
    private Long id;
    private String complaintNumber;
    private String title;
    private String description;
    private String source;
    private String priority;
    private String status;
    private String category;
    private Long categoryId;
    private String equipment;
    private Long equipmentId;
    private String equipmentReference;
    private String location;
    private Long locationId;
    private String department;
    private String reporter;
    private String resolvedBy;
    private String group;
    private Double confidence;
    private OffsetDateTime createdAt;
    private OffsetDateTime resolvedAt;
    private List<String> imageUrls;
    private List<ComplaintEventDto> events;
}

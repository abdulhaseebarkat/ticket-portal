package com.plantit.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class ComplaintEventDto {
    private String eventType;
    private String oldValue;
    private String newValue;
    private String description;
    private String performedBy;
    private OffsetDateTime createdAt;
}

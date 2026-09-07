package com.plantit.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppGroupDto {
    private Long id;
    private String externalGroupId;
    private String name;
    private String area;
    private boolean active;
    private boolean monitoringEnabled;
    private String defaultCategory;
}

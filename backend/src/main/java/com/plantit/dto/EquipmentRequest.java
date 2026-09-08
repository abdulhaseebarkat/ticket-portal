package com.plantit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentRequest {
    @NotBlank
    private String equipmentCode;
    @NotBlank
    private String name;
    private String type;
    private String manufacturer;
    private String model;
    private Long locationId;
    private String department;
    private boolean active;
}

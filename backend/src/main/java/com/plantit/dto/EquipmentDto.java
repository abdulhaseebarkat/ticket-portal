package com.plantit.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentDto {
    private Long id;
    private String equipmentCode;
    private String name;
    private String type;
    private boolean active;
}

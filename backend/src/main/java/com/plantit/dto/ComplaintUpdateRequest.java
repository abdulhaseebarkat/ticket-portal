package com.plantit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * A manual correction to a complaint's interpreted fields - lets an admin
 * fix a wrong equipment/location/category read (or an outright missed
 * one) without needing the original WhatsApp message replayed. Null on
 * categoryId/equipmentId/locationId means "unassign", not "leave
 * unchanged" - the frontend always sends the complete edited state.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintUpdateRequest {
    @NotBlank
    private String title;
    private Long categoryId;
    private Long equipmentId;
    private String equipmentReference;
    private Long locationId;
    @NotBlank
    private String priority;
    @NotBlank
    private String status;
}

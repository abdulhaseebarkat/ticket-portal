package com.plantit.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppSimulateRequest {
    @NotBlank
    private String groupName;
    @NotBlank
    private String employeeName;
    @NotBlank
    private String message;
}

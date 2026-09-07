package com.plantit.dto.bridge;

import lombok.*;
import jakarta.validation.constraints.NotBlank;

/**
 * One message forwarded by the whatsapp-bridge service. Bound from
 * multipart form fields (an optional image file part travels alongside
 * this on the same request).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMessagePayload {
    @NotBlank
    private String externalGroupId;
    @NotBlank
    private String externalMessageId;
    private String quotedExternalMessageId;
    @NotBlank
    private String senderWhatsapp;
    private String senderName;
    private String messageText;
    private String messageType;
}

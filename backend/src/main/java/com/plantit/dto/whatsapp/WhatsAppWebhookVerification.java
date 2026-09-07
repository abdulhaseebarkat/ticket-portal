package com.plantit.dto.whatsapp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class WhatsAppWebhookVerification {
    private String hub_mode;
    private String hub_challenge;
    private String hub_verify_token;
}

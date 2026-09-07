package com.plantit.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.whatsapp")
@Getter
@Setter
public class WhatsAppProperties {
    private boolean enabled;
    private String phoneNumberId;
    private String businessAccountId;
    private String accessToken;
    private String webhookVerifyToken;

    /** Shared secret the whatsapp-bridge service must send on every ingestion request. */
    private String bridgeSecret;
    /** Local directory complaint image attachments are written to, served at /media/**. */
    private String mediaStoragePath;
}

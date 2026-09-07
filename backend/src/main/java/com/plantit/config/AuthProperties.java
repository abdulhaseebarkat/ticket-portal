package com.plantit.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.auth")
@Getter
@Setter
public class AuthProperties {
    /** Signs and verifies login session tokens - MUST be overridden to a real random value for any real deployment. */
    private String tokenSecret;
    private int tokenExpirationMinutes;

    /** Used only to seed the one portal account on first startup (table empty); ignored after that. */
    private String seedEmail;
    private String seedPassword;
}

package com.plantit.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.gemini")
@Getter
@Setter
public class GeminiProperties {
    /** aistudio.google.com API key. Required only when app.classification.provider=gemini. */
    private String apiKey;
    // gemini-2.5-flash is access-restricted to accounts that already used
    // it before - a brand-new account/project gets rejected. 3.8-flash
    // works but its free-tier quota is a hard 5 requests/minute (confirmed
    // via a live 429 response) and it hits "model overloaded" 503s often,
    // being the newest/most in-demand model. flash-lite matched 3.8's
    // classification accuracy in testing (after a prompt fix) and survived
    // 15 rapid back-to-back calls with zero rate-limit errors - the better
    // choice for a background classifier at this message volume.
    private String model = "gemini-3.5-flash-lite";
    /** How long to wait for Gemini before falling back to the keyword classifier for that message. */
    private long timeoutMs = 8000;
}

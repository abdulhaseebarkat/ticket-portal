package com.plantit.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.groq")
@Getter
@Setter
public class GroqProperties {
    /** console.groq.com API key. Required only when app.classification.provider=groq. */
    private String apiKey;
    private String model = "llama-3.3-70b-versatile";
    /** How long to wait for Groq before falling back to the keyword classifier for that message. */
    private long timeoutMs = 8000;
}

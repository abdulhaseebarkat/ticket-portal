package com.plantit.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Picks which ComplaintClassificationProvider bean handles incoming
 * messages - "mock" (the built-in keyword classifier, the default) or
 * "groq" (the Groq-backed AI classifier). Switching back to "mock" is a
 * config-only change, no code/redeploy needed beyond a restart.
 */
@Component
@ConfigurationProperties(prefix = "app.classification")
@Getter
@Setter
public class ClassificationProperties {
    private String provider = "mock";
}

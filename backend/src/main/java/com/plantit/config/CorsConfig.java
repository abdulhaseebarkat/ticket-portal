package com.plantit.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Which origins the browser is allowed to call /api/** from. This is
 * separate from whether a request is "really" cross-origin from a network
 * standpoint - even a request the frontend's nginx proxies on the same
 * origin the page loads from still carries a real Origin header that
 * Spring checks against this list. Every deployment's actual origin (its
 * domain, or an IP:port during testing) needs to be in here, or every
 * request fails with 403 before it even reaches a controller - this bit a
 * real deployment (see git history) because the origin was hardcoded to
 * localhost:5173 only.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    private static final String LOCAL_DEV_ORIGIN = "http://localhost:5173";

    private final String allowedOriginsProperty;

    public CorsConfig(@Value("${app.cors.allowed-origins:}") String allowedOriginsProperty) {
        this.allowedOriginsProperty = allowedOriginsProperty;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(resolveAllowedOrigins().toArray(new String[0]))
                .allowedMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    private List<String> resolveAllowedOrigins() {
        Set<String> origins = new LinkedHashSet<>();
        origins.add(LOCAL_DEV_ORIGIN);
        if (allowedOriginsProperty != null && !allowedOriginsProperty.isBlank()) {
            Arrays.stream(allowedOriginsProperty.split(","))
                    .map(String::trim)
                    .filter(origin -> !origin.isEmpty())
                    .forEach(origins::add);
        }
        return new ArrayList<>(origins);
    }
}

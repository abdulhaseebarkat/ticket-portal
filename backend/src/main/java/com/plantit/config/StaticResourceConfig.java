package com.plantit.config;

import com.plantit.service.support.MediaStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * Serves complaint image attachments saved by MediaStorageService at
 * /media/**.
 */
@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {
    private final MediaStorageService mediaStorageService;

    public StaticResourceConfig(MediaStorageService mediaStorageService) {
        this.mediaStorageService = mediaStorageService;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Paths.get(mediaStorageService.resolveMediaPath()).toAbsolutePath().toUri().toString();
        registry.addResourceHandler("/media/**").addResourceLocations(location);
    }
}

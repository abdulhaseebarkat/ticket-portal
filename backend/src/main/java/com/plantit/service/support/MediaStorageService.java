package com.plantit.service.support;

import com.plantit.config.WhatsAppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Saves complaint image attachments (photos employees post in WhatsApp
 * groups) to local disk, since images "sometimes" accompany complaints but
 * there's no cloud storage account for this prototype yet.
 */
@Component
public class MediaStorageService {
    private static final Logger log = LoggerFactory.getLogger(MediaStorageService.class);

    private final WhatsAppProperties properties;

    public MediaStorageService(WhatsAppProperties properties) {
        this.properties = properties;
    }

    /**
     * Stores the uploaded file and returns the relative URL it will be
     * served at (see StaticResourceConfig), or null if storage failed.
     */
    public String store(MultipartFile file) {
        try {
            Path directory = Paths.get(resolveMediaPath());
            Files.createDirectories(directory);
            String filename = UUID.randomUUID() + extractExtension(file.getOriginalFilename());
            file.transferTo(directory.resolve(filename));
            return "/media/" + filename;
        } catch (IOException e) {
            log.error("Failed to store WhatsApp media attachment", e);
            return null;
        }
    }

    public String resolveMediaPath() {
        String path = properties.getMediaStoragePath();
        return (path == null || path.isBlank()) ? "./data/whatsapp-media" : path;
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null) {
            return ".jpg";
        }
        int dot = originalFilename.lastIndexOf('.');
        return dot >= 0 ? originalFilename.substring(dot) : ".jpg";
    }
}

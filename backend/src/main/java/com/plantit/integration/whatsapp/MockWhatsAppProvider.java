package com.plantit.integration.whatsapp;

import com.plantit.entity.WhatsAppGroup;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class MockWhatsAppProvider implements WhatsAppMessageProvider {
    @Override
    public void start() {
        // No-op for mock provider
    }

    @Override
    public void stop() {
        // No-op for mock provider
    }

    @Override
    public boolean isConnected() {
        return true;
    }

    @Override
    public List<WhatsAppGroup> getMonitoredGroups() {
        return List.of();
    }

    @Override
    public void sendMessage(String destination, String message) {
        // Mock send for future integration
    }
}

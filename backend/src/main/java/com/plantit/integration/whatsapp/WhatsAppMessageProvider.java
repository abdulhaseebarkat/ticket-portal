package com.plantit.integration.whatsapp;

import com.plantit.entity.WhatsAppGroup;
import java.util.List;

public interface WhatsAppMessageProvider {
    void start();
    void stop();
    boolean isConnected();
    List<WhatsAppGroup> getMonitoredGroups();
    void sendMessage(String destination, String message);
}

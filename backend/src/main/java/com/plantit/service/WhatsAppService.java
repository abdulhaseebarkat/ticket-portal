package com.plantit.service;

import com.plantit.dto.WhatsAppSimulateRequest;

public interface WhatsAppService {
    void simulateIncomingMessage(WhatsAppSimulateRequest request);
    void processRealIncomingMessage(String senderPhone, String messageText, String externalMessageId, String phoneNumberId);
}

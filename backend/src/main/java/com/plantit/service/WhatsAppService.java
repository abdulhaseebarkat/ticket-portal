package com.plantit.service;

public interface WhatsAppService {
    void processRealIncomingMessage(String senderPhone, String messageText, String externalMessageId, String phoneNumberId);
}

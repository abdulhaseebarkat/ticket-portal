package com.plantit.controller;

import com.plantit.dto.WhatsAppSimulateRequest;
import com.plantit.service.WhatsAppService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/whatsapp")
public class WhatsAppController {
    private final WhatsAppService whatsAppService;

    public WhatsAppController(WhatsAppService whatsAppService) {
        this.whatsAppService = whatsAppService;
    }

    @PostMapping("/simulate")
    public ResponseEntity<Void> simulate(@Valid @RequestBody WhatsAppSimulateRequest request) {
        whatsAppService.simulateIncomingMessage(request);
        return ResponseEntity.ok().build();
    }
}

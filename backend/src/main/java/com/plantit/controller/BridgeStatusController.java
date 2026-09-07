package com.plantit.controller;

import com.plantit.dto.BridgeStatusDto;
import com.plantit.service.BridgeStatusService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only WhatsApp bridge connectivity status for the logged-in user.
 * Deliberately a different path from /api/whatsapp/bridge/** (which is for
 * the bridge service itself, secret-protected, not a user session) so this
 * one goes through the normal login-required auth like everything else.
 */
@RestController
@RequestMapping("/api/whatsapp/bridge-status")
public class BridgeStatusController {
    private final BridgeStatusService bridgeStatusService;

    public BridgeStatusController(BridgeStatusService bridgeStatusService) {
        this.bridgeStatusService = bridgeStatusService;
    }

    @GetMapping
    public ResponseEntity<BridgeStatusDto> getStatus() {
        return ResponseEntity.ok(bridgeStatusService.getStatus());
    }
}

package com.plantit.controller;

import com.plantit.config.WhatsAppProperties;
import com.plantit.dto.bridge.BridgeHeartbeatRequest;
import com.plantit.dto.bridge.GroupMessagePayload;
import com.plantit.dto.bridge.GroupSyncRequest;
import com.plantit.service.BridgeStatusService;
import com.plantit.service.GroupComplaintIngestionService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Ingestion endpoint for the whatsapp-bridge companion service (see
 * whatsapp-bridge/). Not part of Meta's WhatsApp Business Cloud API - that
 * API cannot read group messages at all. This is a purpose-built channel
 * for the unofficial group-reading bridge, so it's locked behind a shared
 * secret rather than the open CORS-only policy the rest of the API uses.
 */
@Slf4j
@RestController
@RequestMapping("/api/whatsapp/bridge")
public class WhatsAppBridgeController {
    private final GroupComplaintIngestionService ingestionService;
    private final WhatsAppProperties properties;
    private final BridgeStatusService bridgeStatusService;

    public WhatsAppBridgeController(GroupComplaintIngestionService ingestionService,
                                     WhatsAppProperties properties,
                                     BridgeStatusService bridgeStatusService) {
        this.ingestionService = ingestionService;
        this.properties = properties;
        this.bridgeStatusService = bridgeStatusService;
    }

    /**
     * The bridge calls this roughly every 60s while running, and
     * immediately on connect/disconnect - lets the portal warn when it's
     * gone quiet instead of silently missing new complaints.
     */
    @PostMapping("/heartbeat")
    public ResponseEntity<Void> heartbeat(@RequestHeader(value = "X-Bridge-Secret", required = false) String secret,
                                           @Valid @RequestBody BridgeHeartbeatRequest request) {
        if (!isAuthorized(secret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        bridgeStatusService.recordHeartbeat(request.getStatus());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/groups/sync")
    public ResponseEntity<Void> syncGroups(@RequestHeader(value = "X-Bridge-Secret", required = false) String secret,
                                            @Valid @RequestBody GroupSyncRequest request) {
        if (!isAuthorized(secret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        ingestionService.syncGroups(request.getGroups());
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/messages", consumes = "multipart/form-data")
    public ResponseEntity<Void> ingestMessage(@RequestHeader(value = "X-Bridge-Secret", required = false) String secret,
                                               @RequestParam String externalGroupId,
                                               @RequestParam String externalMessageId,
                                               @RequestParam(required = false) String quotedExternalMessageId,
                                               @RequestParam String senderWhatsapp,
                                               @RequestParam(required = false) String senderName,
                                               @RequestParam(required = false) String messageText,
                                               @RequestParam(required = false) String messageType,
                                               @RequestParam(required = false) MultipartFile image,
                                               @RequestParam(required = false) String messageTimestamp) {
        if (!isAuthorized(secret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        GroupMessagePayload payload = GroupMessagePayload.builder()
                .externalGroupId(externalGroupId)
                .externalMessageId(externalMessageId)
                .quotedExternalMessageId(quotedExternalMessageId)
                .senderWhatsapp(senderWhatsapp)
                .senderName(senderName)
                .messageText(messageText)
                .messageType(messageType)
                .messageTimestamp(messageTimestamp != null && !messageTimestamp.isBlank()
                        ? java.time.OffsetDateTime.parse(messageTimestamp)
                        : null)
                .build();

        ingestionService.ingestMessage(payload, image);
        return ResponseEntity.ok().build();
    }

    private boolean isAuthorized(String providedSecret) {
        String expected = properties.getBridgeSecret();
        if (expected == null || expected.isBlank()) {
            log.error("Rejecting whatsapp-bridge request: app.whatsapp.bridge-secret (WHATSAPP_BRIDGE_SECRET) is not configured");
            return false;
        }
        return expected.equals(providedSecret);
    }
}

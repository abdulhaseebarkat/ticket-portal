package com.plantit.controller;

import com.plantit.dto.WhatsAppGroupDto;
import com.plantit.service.GroupComplaintIngestionService;
import com.plantit.service.WhatsAppGroupService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin view of known WhatsApp groups, including ones auto-discovered by
 * the bridge but not yet turned on. Enabling monitoring here is what lets a
 * discovered group start turning into complaints.
 */
@RestController
@RequestMapping("/api/whatsapp/groups")
public class WhatsAppGroupController {
    private final WhatsAppGroupService groupService;
    private final GroupComplaintIngestionService ingestionService;

    public WhatsAppGroupController(WhatsAppGroupService groupService, GroupComplaintIngestionService ingestionService) {
        this.groupService = groupService;
        this.ingestionService = ingestionService;
    }

    @GetMapping
    public ResponseEntity<List<WhatsAppGroupDto>> list() {
        return ResponseEntity.ok(groupService.listAll());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<WhatsAppGroupDto> update(@PathVariable Long id, @RequestBody WhatsAppGroupDto groupDto) {
        return ResponseEntity.ok(groupService.update(id, groupDto));
    }

    /**
     * Rebuilds this group's complaints from its already-stored message
     * history using the current classification/correlation logic - a way to
     * re-verify a fix without resending anything on WhatsApp.
     */
    @PostMapping("/{id}/replay")
    public ResponseEntity<Map<String, Integer>> replay(@PathVariable Long id) {
        int replayed = ingestionService.replayGroup(id);
        return ResponseEntity.ok(Map.of("messagesReplayed", replayed));
    }
}

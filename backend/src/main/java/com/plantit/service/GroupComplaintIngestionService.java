package com.plantit.service;

import com.plantit.dto.bridge.GroupMessagePayload;
import com.plantit.dto.bridge.GroupSyncItem;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Entry point for the whatsapp-bridge service: registers the WhatsApp
 * groups it finds itself a member of, and ingests messages from the ones an
 * admin has turned monitoring on for.
 */
public interface GroupComplaintIngestionService {
    void syncGroups(List<GroupSyncItem> groups);

    void ingestMessage(GroupMessagePayload payload, MultipartFile image);

    /**
     * Rebuilds a group's complaints from scratch by re-running its entire
     * stored message history through the current classification/correlation
     * logic - lets a classifier or correlation fix be re-verified without
     * resending anything on WhatsApp. Returns how many messages were replayed.
     */
    int replayGroup(Long groupId);
}

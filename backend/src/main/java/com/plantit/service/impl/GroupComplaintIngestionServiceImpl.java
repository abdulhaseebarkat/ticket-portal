package com.plantit.service.impl;

import com.plantit.dto.bridge.GroupMessagePayload;
import com.plantit.dto.bridge.GroupSyncItem;
import com.plantit.entity.Complaint;
import com.plantit.entity.Employee;
import com.plantit.entity.WhatsAppGroup;
import com.plantit.entity.WhatsAppMessage;
import com.plantit.integration.ai.ComplaintClassificationProvider;
import com.plantit.integration.ai.model.ClassificationResult;
import com.plantit.repository.ComplaintEventRepository;
import com.plantit.repository.ComplaintMessageRepository;
import com.plantit.repository.ComplaintRepository;
import com.plantit.repository.WhatsAppGroupRepository;
import com.plantit.repository.WhatsAppMessageRepository;
import com.plantit.service.GroupComplaintIngestionService;
import com.plantit.service.support.ComplaintPipeline;
import com.plantit.service.support.EmployeeLookupService;
import com.plantit.service.support.IngestionContext;
import com.plantit.service.support.MediaStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class GroupComplaintIngestionServiceImpl implements GroupComplaintIngestionService {
    private static final Logger log = LoggerFactory.getLogger(GroupComplaintIngestionServiceImpl.class);
    private static final String COMPLAINT_NUMBER_PREFIX = "WA-GRP-";

    private final WhatsAppGroupRepository groupRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final ComplaintRepository complaintRepository;
    private final ComplaintMessageRepository complaintMessageRepository;
    private final ComplaintEventRepository complaintEventRepository;
    private final ComplaintClassificationProvider classificationProvider;
    private final EmployeeLookupService employeeLookupService;
    private final ComplaintPipeline complaintPipeline;
    private final MediaStorageService mediaStorageService;

    public GroupComplaintIngestionServiceImpl(
            WhatsAppGroupRepository groupRepository,
            WhatsAppMessageRepository messageRepository,
            ComplaintRepository complaintRepository,
            ComplaintMessageRepository complaintMessageRepository,
            ComplaintEventRepository complaintEventRepository,
            ComplaintClassificationProvider classificationProvider,
            EmployeeLookupService employeeLookupService,
            ComplaintPipeline complaintPipeline,
            MediaStorageService mediaStorageService) {
        this.groupRepository = groupRepository;
        this.messageRepository = messageRepository;
        this.complaintRepository = complaintRepository;
        this.complaintMessageRepository = complaintMessageRepository;
        this.complaintEventRepository = complaintEventRepository;
        this.classificationProvider = classificationProvider;
        this.employeeLookupService = employeeLookupService;
        this.complaintPipeline = complaintPipeline;
        this.mediaStorageService = mediaStorageService;
    }

    @Override
    @Transactional
    public void syncGroups(List<GroupSyncItem> groups) {
        if (groups == null) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now();
        for (GroupSyncItem item : groups) {
            if (item.getExternalGroupId() == null || item.getExternalGroupId().isBlank()) {
                continue;
            }
            Optional<WhatsAppGroup> existing = groupRepository.findByExternalGroupId(item.getExternalGroupId());
            if (existing.isPresent()) {
                WhatsAppGroup group = existing.get();
                if (item.getName() != null && !item.getName().isBlank() && !item.getName().equals(group.getName())) {
                    group.setName(item.getName());
                    groupRepository.save(group);
                }
            } else {
                String displayName = (item.getName() != null && !item.getName().isBlank()) ? item.getName() : item.getExternalGroupId();
                groupRepository.save(WhatsAppGroup.builder()
                        .externalGroupId(item.getExternalGroupId())
                        .name(displayName)
                        .active(true)
                        .monitoringEnabled(false)
                        .createdAt(now)
                        .build());
                log.info("Discovered new WhatsApp group '{}' ({}) - monitoring is OFF until enabled in the Groups page", displayName, item.getExternalGroupId());
            }
        }
    }

    @Override
    @Transactional
    public void ingestMessage(GroupMessagePayload payload, MultipartFile image) {
        // WhatsApp message IDs are stable and unique regardless of whether a
        // message arrives live or through the history backfill - this is
        // what keeps backfilling a group's recent history from ever creating
        // a duplicate message/complaint for something already captured.
        if (messageRepository.findByExternalMessageId(payload.getExternalMessageId()).isPresent()) {
            log.debug("Skipping message {} - already ingested", payload.getExternalMessageId());
            return;
        }

        Optional<WhatsAppGroup> groupOpt = groupRepository.findByExternalGroupId(payload.getExternalGroupId());
        if (groupOpt.isEmpty()) {
            log.warn("Received a message for an unknown WhatsApp group {} - was it synced yet?", payload.getExternalGroupId());
            return;
        }
        WhatsAppGroup group = groupOpt.get();

        Optional<Employee> employee = employeeLookupService.findByPhoneNumber(payload.getSenderWhatsapp());
        // A backfilled historical message carries its own real send time so
        // the dashboard timeline stays accurate; a live message has none and
        // simply uses "now", as it always has.
        OffsetDateTime now = payload.getMessageTimestamp() != null ? payload.getMessageTimestamp() : OffsetDateTime.now();
        String mediaUrl = (image != null && !image.isEmpty()) ? mediaStorageService.store(image) : null;

        // Every message from a known group is stored for audit/review, even
        // before an admin turns monitoring on for it.
        WhatsAppMessage message = messageRepository.save(WhatsAppMessage.builder()
                .externalMessageId(payload.getExternalMessageId())
                .quotedExternalMessageId(payload.getQuotedExternalMessageId())
                .group(group)
                .senderEmployee(employee.orElse(null))
                .senderName(employee.map(Employee::getName).orElse(payload.getSenderName()))
                .senderWhatsapp(payload.getSenderWhatsapp())
                .messageText(payload.getMessageText())
                .messageType(payload.getMessageType() != null ? payload.getMessageType() : "text")
                .mediaUrl(mediaUrl)
                .timestamp(now)
                .processed(false)
                .processingStatus("Stored")
                .createdAt(now)
                .build());

        processThroughPipeline(group, message, now);
    }

    @Override
    @Transactional
    public int replayGroup(Long groupId) {
        WhatsAppGroup group = groupRepository.findById(groupId).orElseThrow();

        // Rebuilding from scratch means clearing out whatever this group's
        // messages previously produced, so re-running them doesn't create
        // duplicates alongside the old (possibly wrong) results.
        List<Complaint> existingComplaints = complaintRepository.findAll().stream()
                .filter(complaint -> group.equals(complaint.getWhatsappGroup()))
                .toList();
        for (Complaint complaint : existingComplaints) {
            complaintMessageRepository.deleteByComplaintId(complaint.getId());
            complaintEventRepository.deleteByComplaintId(complaint.getId());
        }
        complaintRepository.deleteAll(existingComplaints);

        List<WhatsAppMessage> messages = messageRepository.findByGroupIdOrderByCreatedAtAsc(groupId);
        if (group.isMonitoringEnabled()) {
            for (WhatsAppMessage message : messages) {
                // Replay using each message's own original timestamp, so
                // history reads accurately rather than as if everything
                // just happened right now.
                processThroughPipeline(group, message, message.getCreatedAt());
            }
        } else {
            log.info("Group '{}' is not monitored - replay only cleared old complaints, nothing was recreated", group.getName());
        }
        return messages.size();
    }

    /**
     * Runs one already-persisted raw message through classification and the
     * complaint pipeline. Shared by live ingestion and history replay so
     * both use identical logic.
     */
    private void processThroughPipeline(WhatsAppGroup group, WhatsAppMessage message, OffsetDateTime now) {
        if (!group.isMonitoringEnabled()) {
            log.debug("Group '{}' is not monitored yet - message stored for review only", group.getName());
            return;
        }

        Optional<Employee> employee = employeeLookupService.findByPhoneNumber(message.getSenderWhatsapp());
        String text = message.getMessageText() != null ? message.getMessageText() : "";
        ClassificationResult classification = classificationProvider.classifyMessage(text);
        String senderLabel = employee.map(Employee::getName)
                .orElse(message.getSenderName() != null && !message.getSenderName().isBlank() ? message.getSenderName() : message.getSenderWhatsapp());

        complaintPipeline.apply(IngestionContext.builder()
                .classification(classification)
                .messageText(text)
                .sender(employee.orElse(null))
                .senderLabel(senderLabel)
                .supportStaff(employee.map(employeeLookupService::isSupportStaff).orElse(false))
                .group(group)
                .whatsAppMessage(message)
                .quotedExternalMessageId(message.getQuotedExternalMessageId())
                .now(now)
                .complaintNumberPrefix(COMPLAINT_NUMBER_PREFIX)
                .build());
    }
}

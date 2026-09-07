package com.plantit.service.impl;

import com.plantit.dto.WhatsAppSimulateRequest;
import com.plantit.entity.Employee;
import com.plantit.entity.WhatsAppGroup;
import com.plantit.entity.WhatsAppMessage;
import com.plantit.integration.ai.ComplaintClassificationProvider;
import com.plantit.integration.ai.model.ClassificationResult;
import com.plantit.integration.whatsapp.WhatsAppMessageProvider;
import com.plantit.repository.EmployeeRepository;
import com.plantit.repository.WhatsAppGroupRepository;
import com.plantit.repository.WhatsAppMessageRepository;
import com.plantit.service.WhatsAppService;
import com.plantit.service.support.ComplaintPipeline;
import com.plantit.service.support.EmployeeLookupService;
import com.plantit.service.support.IngestionContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
public class WhatsAppServiceImpl implements WhatsAppService {
    private static final Logger log = LoggerFactory.getLogger(WhatsAppServiceImpl.class);

    private final EmployeeRepository employeeRepository;
    private final WhatsAppGroupRepository groupRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final ComplaintClassificationProvider classificationProvider;
    private final WhatsAppMessageProvider whatsappProvider;
    private final EmployeeLookupService employeeLookupService;
    private final ComplaintPipeline complaintPipeline;

    public WhatsAppServiceImpl(
            EmployeeRepository employeeRepository,
            WhatsAppGroupRepository groupRepository,
            WhatsAppMessageRepository messageRepository,
            ComplaintClassificationProvider classificationProvider,
            WhatsAppMessageProvider whatsappProvider,
            EmployeeLookupService employeeLookupService,
            ComplaintPipeline complaintPipeline) {
        this.employeeRepository = employeeRepository;
        this.groupRepository = groupRepository;
        this.messageRepository = messageRepository;
        this.classificationProvider = classificationProvider;
        this.whatsappProvider = whatsappProvider;
        this.employeeLookupService = employeeLookupService;
        this.complaintPipeline = complaintPipeline;
    }

    @Override
    @Transactional
    public void simulateIncomingMessage(WhatsAppSimulateRequest request) {
        Optional<WhatsAppGroup> group = groupRepository.findAll().stream()
                .filter(it -> it.getName().equalsIgnoreCase(request.getGroupName()))
                .findFirst();
        if (group.isEmpty()) {
            return;
        }

        Optional<Employee> employee = employeeRepository.findAll().stream()
                .filter(it -> it.getName().equalsIgnoreCase(request.getEmployeeName()))
                .findFirst();

        ClassificationResult classification = classificationProvider.classifyMessage(request.getMessage());
        OffsetDateTime now = OffsetDateTime.now();

        WhatsAppMessage message = messageRepository.save(WhatsAppMessage.builder()
                .externalMessageId("mock-" + System.currentTimeMillis())
                .group(group.get())
                .senderEmployee(employee.orElse(null))
                .senderName(request.getEmployeeName())
                .senderWhatsapp(employee.map(Employee::getWhatsappNumber).orElse("unknown"))
                .messageText(request.getMessage())
                .messageType("text")
                .timestamp(now)
                .processed(false)
                .processingStatus(classification.isComplaint() ? "Classified" : "Unprocessed")
                .createdAt(now)
                .build());

        complaintPipeline.apply(IngestionContext.builder()
                .classification(classification)
                .messageText(request.getMessage())
                .sender(employee.orElse(null))
                .senderLabel(employee.map(Employee::getName).orElse(request.getEmployeeName()))
                .supportStaff(employee.map(employeeLookupService::isSupportStaff).orElse(false))
                .group(group.get())
                .whatsAppMessage(message)
                .now(now)
                .complaintNumberPrefix("IT-")
                .build());

        whatsappProvider.sendMessage(request.getEmployeeName(), request.getMessage());
    }

    @Override
    @Transactional
    public void processRealIncomingMessage(String senderPhone, String messageText, String externalMessageId, String phoneNumberId) {
        try {
            Optional<Employee> employee = employeeLookupService.findByPhoneNumber(senderPhone);

            // Get default group (in production, link groups to phone numbers)
            Optional<WhatsAppGroup> group = groupRepository.findAll().stream()
                    .filter(WhatsAppGroup::isMonitoringEnabled)
                    .findFirst();

            if (group.isEmpty()) {
                log.warn("No active WhatsApp group found for phone: {}", senderPhone);
                return;
            }

            ClassificationResult classification = classificationProvider.classifyMessage(messageText);
            OffsetDateTime now = OffsetDateTime.now();

            WhatsAppMessage message = messageRepository.save(WhatsAppMessage.builder()
                    .externalMessageId(externalMessageId)
                    .group(group.get())
                    .senderEmployee(employee.orElse(null))
                    .senderName(employee.map(Employee::getName).orElse("Unknown Sender"))
                    .senderWhatsapp(senderPhone)
                    .messageText(messageText)
                    .messageType("text")
                    .timestamp(now)
                    .processed(false)
                    .processingStatus(classification.isComplaint() ? "Classified" : "Unprocessed")
                    .createdAt(now)
                    .build());

            complaintPipeline.apply(IngestionContext.builder()
                    .classification(classification)
                    .messageText(messageText)
                    .sender(employee.orElse(null))
                    .senderLabel(employee.map(Employee::getName).orElse(senderPhone))
                    .supportStaff(employee.map(employeeLookupService::isSupportStaff).orElse(false))
                    .group(group.get())
                    .whatsAppMessage(message)
                    .now(now)
                    .complaintNumberPrefix("WA-")
                    .build());
        } catch (Exception e) {
            log.error("Error processing real WhatsApp message", e);
        }
    }
}

package com.plantit.service.impl;

import com.plantit.dto.ComplaintDetailDto;
import com.plantit.dto.ComplaintEventDto;
import com.plantit.dto.ComplaintSummaryDto;
import com.plantit.dto.ComplaintUpdateRequest;
import com.plantit.entity.Category;
import com.plantit.entity.Complaint;
import com.plantit.entity.ComplaintEvent;
import com.plantit.entity.ComplaintMessage;
import com.plantit.entity.Equipment;
import com.plantit.entity.Location;
import com.plantit.entity.WhatsAppMessage;
import com.plantit.repository.CategoryRepository;
import com.plantit.repository.ComplaintEventRepository;
import com.plantit.repository.ComplaintMessageRepository;
import com.plantit.repository.ComplaintRepository;
import com.plantit.repository.EquipmentRepository;
import com.plantit.repository.LocationRepository;
import com.plantit.service.ComplaintService;
import com.plantit.service.support.ComplaintSummaryMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
public class ComplaintServiceImpl implements ComplaintService {
    private final ComplaintRepository complaintRepository;
    private final ComplaintEventRepository complaintEventRepository;
    private final ComplaintMessageRepository complaintMessageRepository;
    private final ComplaintSummaryMapper complaintSummaryMapper;
    private final CategoryRepository categoryRepository;
    private final EquipmentRepository equipmentRepository;
    private final LocationRepository locationRepository;

    public ComplaintServiceImpl(ComplaintRepository complaintRepository,
                                 ComplaintEventRepository complaintEventRepository,
                                 ComplaintMessageRepository complaintMessageRepository,
                                 ComplaintSummaryMapper complaintSummaryMapper,
                                 CategoryRepository categoryRepository,
                                 EquipmentRepository equipmentRepository,
                                 LocationRepository locationRepository) {
        this.complaintRepository = complaintRepository;
        this.complaintEventRepository = complaintEventRepository;
        this.complaintMessageRepository = complaintMessageRepository;
        this.complaintSummaryMapper = complaintSummaryMapper;
        this.categoryRepository = categoryRepository;
        this.equipmentRepository = equipmentRepository;
        this.locationRepository = locationRepository;
    }

    @Override
    public List<ComplaintSummaryDto> listAll() {
        return complaintRepository.findAll().stream()
                .sorted(Comparator.comparing(Complaint::getCreatedAt).reversed())
                .map(complaintSummaryMapper::toSummary)
                .toList();
    }

    @Override
    public ComplaintDetailDto getDetail(Long id) {
        Complaint complaint = complaintRepository.findById(id).orElseThrow();
        return toDetailDto(complaint);
    }

    @Override
    @Transactional
    public ComplaintDetailDto updateComplaint(Long id, ComplaintUpdateRequest request, String performedBy) {
        Complaint complaint = complaintRepository.findById(id).orElseThrow();

        Category newCategory = request.getCategoryId() == null ? null
                : categoryRepository.findById(request.getCategoryId()).orElseThrow();
        Equipment newEquipment = request.getEquipmentId() == null ? null
                : equipmentRepository.findById(request.getEquipmentId()).orElseThrow();
        Location newLocation = request.getLocationId() == null ? null
                : locationRepository.findById(request.getLocationId()).orElseThrow();

        List<String> changes = new ArrayList<>();
        describeChange(changes, "Title", complaint.getTitle(), request.getTitle());
        describeChange(changes, "Category",
                complaint.getCategory() == null ? null : complaint.getCategory().getName(),
                newCategory == null ? null : newCategory.getName());
        describeChange(changes, "Equipment",
                complaint.getEquipment() == null ? null : complaint.getEquipment().getName(),
                newEquipment == null ? null : newEquipment.getName());
        describeChange(changes, "Equipment reference", complaint.getEquipmentReference(), request.getEquipmentReference());
        describeChange(changes, "Location",
                complaint.getLocation() == null ? null : complaint.getLocation().getName(),
                newLocation == null ? null : newLocation.getName());
        describeChange(changes, "Priority", complaint.getPriority(), request.getPriority());
        describeChange(changes, "Status", complaint.getStatus(), request.getStatus());

        if (changes.isEmpty()) {
            return toDetailDto(complaint);
        }

        complaint.setTitle(request.getTitle());
        complaint.setCategory(newCategory);
        // aiCategory drives future WhatsApp reply correlation (see
        // ComplaintCorrelationService) - keeping it in sync with a manual
        // category correction means a later reply on this same complaint
        // matches correctly instead of still comparing against the
        // system's original (wrong) guess.
        complaint.setAiCategory(newCategory == null ? null : newCategory.getName());
        complaint.setEquipment(newEquipment);
        complaint.setEquipmentReference(request.getEquipmentReference());
        complaint.setLocation(newLocation);
        complaint.setPriority(request.getPriority());

        String oldStatus = complaint.getStatus();
        complaint.setStatus(request.getStatus());
        if ("RESOLVED".equalsIgnoreCase(request.getStatus()) && !"RESOLVED".equalsIgnoreCase(oldStatus)) {
            complaint.setResolvedAt(OffsetDateTime.now());
        } else if (!"RESOLVED".equalsIgnoreCase(request.getStatus())) {
            complaint.setResolvedAt(null);
        }

        complaint.setUpdatedAt(OffsetDateTime.now());
        complaintRepository.save(complaint);

        complaintEventRepository.save(ComplaintEvent.builder()
                .complaint(complaint)
                .eventType("CORRECTED")
                .description(String.join("; ", changes))
                .performedBy(performedBy)
                .createdAt(OffsetDateTime.now())
                .build());

        return toDetailDto(complaint);
    }

    private void describeChange(List<String> changes, String label, String oldValue, String newValue) {
        String from = (oldValue == null || oldValue.isBlank()) ? "Unassigned" : oldValue;
        String to = (newValue == null || newValue.isBlank()) ? "Unassigned" : newValue;
        if (!from.equals(to)) {
            changes.add(label + ": " + from + " -> " + to);
        }
    }

    private ComplaintDetailDto toDetailDto(Complaint complaint) {
        Long id = complaint.getId();
        List<ComplaintEventDto> events = complaintEventRepository.findByComplaintIdOrderByCreatedAtDesc(id).stream()
                .map(event -> ComplaintEventDto.builder()
                        .eventType(event.getEventType())
                        .oldValue(event.getOldValue())
                        .newValue(event.getNewValue())
                        .description(event.getDescription())
                        .performedBy(event.getPerformedBy())
                        .createdAt(event.getCreatedAt())
                        .build())
                .toList();

        List<String> imageUrls = complaintMessageRepository.findByComplaintIdOrderByCreatedAtAsc(id).stream()
                .map(ComplaintMessage::getWhatsappMessage)
                .filter(Objects::nonNull)
                .map(WhatsAppMessage::getMediaUrl)
                .filter(url -> url != null && !url.isBlank())
                .distinct()
                .toList();

        return ComplaintDetailDto.builder()
                .id(complaint.getId())
                .complaintNumber(complaint.getComplaintNumber())
                .title(complaint.getTitle())
                .description(complaint.getDescription())
                .source(complaint.getSource())
                .priority(complaint.getPriority())
                .status(complaint.getStatus())
                .category(complaint.getAiCategory())
                .categoryId(complaint.getCategory() == null ? null : complaint.getCategory().getId())
                .equipment(complaint.getEquipment() == null ? null : complaint.getEquipment().getName())
                .equipmentId(complaint.getEquipment() == null ? null : complaint.getEquipment().getId())
                .equipmentReference(complaint.getEquipmentReference())
                .location(complaint.getLocation() == null ? null : complaint.getLocation().getName())
                .locationId(complaint.getLocation() == null ? null : complaint.getLocation().getId())
                .reporter(complaint.getReporter() == null ? null : complaint.getReporter().getName())
                .group(complaint.getWhatsappGroup() == null ? null : complaint.getWhatsappGroup().getName())
                .confidence(complaint.getAiConfidence())
                .createdAt(complaint.getCreatedAt())
                .resolvedAt(complaint.getResolvedAt())
                .imageUrls(imageUrls)
                .events(events)
                .build();
    }
}

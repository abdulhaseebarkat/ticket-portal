package com.plantit.controller;

import com.plantit.dto.ComplaintDetailDto;
import com.plantit.dto.ComplaintSummaryDto;
import com.plantit.dto.ComplaintUpdateRequest;
import com.plantit.service.ComplaintService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {
    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @GetMapping
    public ResponseEntity<List<ComplaintSummaryDto>> list() {
        return ResponseEntity.ok(complaintService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ComplaintDetailDto> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(complaintService.getDetail(id));
    }

    /**
     * Manual correction of a complaint's interpreted fields (category,
     * equipment, location, etc.) - for when the classifier missed or
     * misread something. Every change is recorded on the complaint's own
     * timeline as a CORRECTED event.
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ComplaintDetailDto> update(@PathVariable Long id,
                                                       @Valid @RequestBody ComplaintUpdateRequest request,
                                                       Authentication authentication) {
        return ResponseEntity.ok(complaintService.updateComplaint(id, request, authentication.getName()));
    }
}

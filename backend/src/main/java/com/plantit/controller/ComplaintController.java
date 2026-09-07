package com.plantit.controller;

import com.plantit.dto.ComplaintDetailDto;
import com.plantit.dto.ComplaintSummaryDto;
import com.plantit.service.ComplaintService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
}

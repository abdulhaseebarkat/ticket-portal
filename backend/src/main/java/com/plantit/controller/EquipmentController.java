package com.plantit.controller;

import com.plantit.dto.EquipmentDto;
import com.plantit.dto.EquipmentRequest;
import com.plantit.service.EquipmentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {
    private final EquipmentService equipmentService;

    public EquipmentController(EquipmentService equipmentService) {
        this.equipmentService = equipmentService;
    }

    @GetMapping
    public ResponseEntity<List<EquipmentDto>> list() {
        return ResponseEntity.ok(equipmentService.listAll());
    }

    @PostMapping
    public ResponseEntity<EquipmentDto> create(@Valid @RequestBody EquipmentRequest request) {
        return ResponseEntity.ok(equipmentService.create(request));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<EquipmentDto> update(@PathVariable Long id, @Valid @RequestBody EquipmentRequest request) {
        return ResponseEntity.ok(equipmentService.update(id, request));
    }
}

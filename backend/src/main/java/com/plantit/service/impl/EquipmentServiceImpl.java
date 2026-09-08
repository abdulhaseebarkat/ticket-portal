package com.plantit.service.impl;

import com.plantit.dto.EquipmentDto;
import com.plantit.dto.EquipmentRequest;
import com.plantit.entity.Equipment;
import com.plantit.entity.Location;
import com.plantit.repository.EquipmentRepository;
import com.plantit.repository.LocationRepository;
import com.plantit.service.EquipmentService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EquipmentServiceImpl implements EquipmentService {
    private final EquipmentRepository equipmentRepository;
    private final LocationRepository locationRepository;

    public EquipmentServiceImpl(EquipmentRepository equipmentRepository, LocationRepository locationRepository) {
        this.equipmentRepository = equipmentRepository;
        this.locationRepository = locationRepository;
    }

    @Override
    public List<EquipmentDto> listAll() {
        return equipmentRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public EquipmentDto create(EquipmentRequest request) {
        Equipment equipment = Equipment.builder()
                .equipmentCode(request.getEquipmentCode())
                .name(request.getName())
                .type(request.getType())
                .manufacturer(request.getManufacturer())
                .model(request.getModel())
                .location(resolveLocation(request.getLocationId()))
                .department(request.getDepartment())
                .active(true)
                .build();
        return toDto(equipmentRepository.save(equipment));
    }

    @Override
    public EquipmentDto update(Long id, EquipmentRequest request) {
        Equipment equipment = equipmentRepository.findById(id).orElseThrow();
        equipment.setEquipmentCode(request.getEquipmentCode());
        equipment.setName(request.getName());
        equipment.setType(request.getType());
        equipment.setManufacturer(request.getManufacturer());
        equipment.setModel(request.getModel());
        equipment.setLocation(resolveLocation(request.getLocationId()));
        equipment.setDepartment(request.getDepartment());
        equipment.setActive(request.isActive());
        return toDto(equipmentRepository.save(equipment));
    }

    private Location resolveLocation(Long locationId) {
        return locationId == null ? null : locationRepository.findById(locationId).orElseThrow();
    }

    private EquipmentDto toDto(Equipment equipment) {
        return EquipmentDto.builder()
                .id(equipment.getId())
                .equipmentCode(equipment.getEquipmentCode())
                .name(equipment.getName())
                .type(equipment.getType())
                .active(equipment.isActive())
                .build();
    }
}

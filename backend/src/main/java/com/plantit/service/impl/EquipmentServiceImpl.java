package com.plantit.service.impl;

import com.plantit.dto.EquipmentDto;
import com.plantit.repository.EquipmentRepository;
import com.plantit.service.EquipmentService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EquipmentServiceImpl implements EquipmentService {
    private final EquipmentRepository equipmentRepository;

    public EquipmentServiceImpl(EquipmentRepository equipmentRepository) {
        this.equipmentRepository = equipmentRepository;
    }

    @Override
    public List<EquipmentDto> listAll() {
        return equipmentRepository.findAll().stream().map(equipment -> EquipmentDto.builder()
                .id(equipment.getId())
                .equipmentCode(equipment.getEquipmentCode())
                .name(equipment.getName())
                .type(equipment.getType())
                .active(equipment.isActive())
                .build()).collect(Collectors.toList());
    }
}

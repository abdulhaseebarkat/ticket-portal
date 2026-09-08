package com.plantit.service;

import com.plantit.dto.EquipmentDto;
import com.plantit.dto.EquipmentRequest;
import java.util.List;

public interface EquipmentService {
    List<EquipmentDto> listAll();

    EquipmentDto create(EquipmentRequest request);

    EquipmentDto update(Long id, EquipmentRequest request);
}

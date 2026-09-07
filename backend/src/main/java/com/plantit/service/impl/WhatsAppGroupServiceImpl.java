package com.plantit.service.impl;

import com.plantit.dto.WhatsAppGroupDto;
import com.plantit.repository.WhatsAppGroupRepository;
import com.plantit.service.WhatsAppGroupService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WhatsAppGroupServiceImpl implements WhatsAppGroupService {
    private final WhatsAppGroupRepository groupRepository;

    public WhatsAppGroupServiceImpl(WhatsAppGroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }

    @Override
    public List<WhatsAppGroupDto> listAll() {
        return groupRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public WhatsAppGroupDto update(Long id, WhatsAppGroupDto groupDto) {
        var group = groupRepository.findById(id).orElseThrow();
        // externalGroupId is the WhatsApp group's real identity, managed by
        // the bridge's group sync - not editable here.
        group.setName(groupDto.getName());
        group.setArea(groupDto.getArea());
        group.setActive(groupDto.isActive());
        group.setMonitoringEnabled(groupDto.isMonitoringEnabled());
        group.setDefaultCategory(groupDto.getDefaultCategory());
        return toDto(groupRepository.save(group));
    }

    private WhatsAppGroupDto toDto(com.plantit.entity.WhatsAppGroup group) {
        return WhatsAppGroupDto.builder()
                .id(group.getId())
                .externalGroupId(group.getExternalGroupId())
                .name(group.getName())
                .area(group.getArea())
                .active(group.isActive())
                .monitoringEnabled(group.isMonitoringEnabled())
                .defaultCategory(group.getDefaultCategory())
                .build();
    }
}

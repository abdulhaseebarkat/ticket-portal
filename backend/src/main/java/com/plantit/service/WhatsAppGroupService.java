package com.plantit.service;

import com.plantit.dto.WhatsAppGroupDto;
import java.util.List;

public interface WhatsAppGroupService {
    List<WhatsAppGroupDto> listAll();

    WhatsAppGroupDto update(Long id, WhatsAppGroupDto groupDto);
}

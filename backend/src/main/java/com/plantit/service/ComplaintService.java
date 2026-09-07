package com.plantit.service;

import com.plantit.dto.ComplaintDetailDto;
import com.plantit.dto.ComplaintSummaryDto;

import java.util.List;

public interface ComplaintService {
    List<ComplaintSummaryDto> listAll();

    ComplaintDetailDto getDetail(Long id);
}

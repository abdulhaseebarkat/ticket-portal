package com.plantit.service;

import com.plantit.dto.ComplaintDetailDto;
import com.plantit.dto.ComplaintSummaryDto;
import com.plantit.dto.ComplaintUpdateRequest;

import java.util.List;

public interface ComplaintService {
    List<ComplaintSummaryDto> listAll();

    ComplaintDetailDto getDetail(Long id);

    /**
     * Applies a manual correction to a complaint's interpreted fields and
     * records what changed as a CORRECTED timeline event, attributed to
     * performedBy (the logged-in admin's email).
     */
    ComplaintDetailDto updateComplaint(Long id, ComplaintUpdateRequest request, String performedBy);
}

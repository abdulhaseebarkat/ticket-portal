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

    /**
     * For when the same real issue got reported as two separate complaints
     * (e.g. someone re-sent the same report, or a reply that should have
     * attached to an existing complaint created its own instead). Moves
     * every message and timeline event from sourceId onto targetId, records
     * a MERGED event on the target noting what was folded in, then deletes
     * the source complaint. The target's own fields (title, category,
     * status, etc.) are left exactly as they are - merging only
     * consolidates the conversation, it never overwrites them.
     */
    ComplaintDetailDto mergeComplaint(Long sourceId, Long targetId, String performedBy);

    /** Permanently removes a complaint that isn't a real complaint at all (and its message/event history) - not a status change, there's no undo. */
    void deleteComplaint(Long id);
}

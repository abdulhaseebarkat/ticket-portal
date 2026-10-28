package com.plantit.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

/** Merges the complaint in the URL path into targetComplaintId - its messages and timeline move onto the target, and it's then deleted. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintMergeRequest {
    @NotNull
    private Long targetComplaintId;
}

package com.plantit.dto.bridge;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupSyncRequest {
    private List<GroupSyncItem> groups;
}

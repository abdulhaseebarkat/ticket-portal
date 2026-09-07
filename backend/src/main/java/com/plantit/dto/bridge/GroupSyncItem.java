package com.plantit.dto.bridge;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupSyncItem {
    private String externalGroupId;
    private String name;
}

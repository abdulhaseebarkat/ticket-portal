package com.plantit.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class BridgeStatusDto {
    /** True only when the bridge's last reported state was "connected" AND its heartbeat is recent. */
    private boolean connected;
    /** True when no heartbeat has arrived recently enough to trust the last reported state. */
    private boolean stale;
    private String status;
    private OffsetDateTime lastHeartbeatAt;
    private Long minutesSinceLastHeartbeat;
}

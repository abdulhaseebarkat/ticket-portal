package com.plantit.service;

import com.plantit.dto.BridgeStatusDto;

public interface BridgeStatusService {
    void recordHeartbeat(String status);

    BridgeStatusDto getStatus();
}

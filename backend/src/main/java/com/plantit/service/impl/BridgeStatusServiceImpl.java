package com.plantit.service.impl;

import com.plantit.dto.BridgeStatusDto;
import com.plantit.entity.BridgeStatus;
import com.plantit.repository.BridgeStatusRepository;
import com.plantit.service.BridgeStatusService;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;

@Service
public class BridgeStatusServiceImpl implements BridgeStatusService {
    /**
     * The bridge heartbeats roughly every 60s while connected. Missing this
     * many minutes' worth means it's either crashed, lost its network, or
     * the whole process died - trust the silence over whatever status it
     * last reported.
     */
    private static final long STALE_AFTER_MINUTES = 3;
    private static final Long SINGLETON_ID = 1L;

    private final BridgeStatusRepository bridgeStatusRepository;

    public BridgeStatusServiceImpl(BridgeStatusRepository bridgeStatusRepository) {
        this.bridgeStatusRepository = bridgeStatusRepository;
    }

    @Override
    public void recordHeartbeat(String status) {
        BridgeStatus record = bridgeStatusRepository.findById(SINGLETON_ID)
                .orElse(BridgeStatus.builder().id(SINGLETON_ID).build());
        record.setStatus(status);
        record.setLastHeartbeatAt(OffsetDateTime.now());
        bridgeStatusRepository.save(record);
    }

    @Override
    public BridgeStatusDto getStatus() {
        return bridgeStatusRepository.findById(SINGLETON_ID)
                .map(this::toDto)
                .orElseGet(() -> BridgeStatusDto.builder()
                        .connected(false)
                        .stale(true)
                        .status("never_connected")
                        .lastHeartbeatAt(null)
                        .minutesSinceLastHeartbeat(null)
                        .build());
    }

    private BridgeStatusDto toDto(BridgeStatus record) {
        long minutesSince = Duration.between(record.getLastHeartbeatAt(), OffsetDateTime.now()).toMinutes();
        boolean stale = minutesSince >= STALE_AFTER_MINUTES;
        boolean connected = !stale && "connected".equals(record.getStatus());
        return BridgeStatusDto.builder()
                .connected(connected)
                .stale(stale)
                .status(record.getStatus())
                .lastHeartbeatAt(record.getLastHeartbeatAt())
                .minutesSinceLastHeartbeat(minutesSince)
                .build();
    }
}

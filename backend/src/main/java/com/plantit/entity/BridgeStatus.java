package com.plantit.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * Single-row table (id is always 1) tracking the WhatsApp bridge's last
 * reported connectivity, so the portal can warn when it's gone quiet
 * instead of silently missing new complaints.
 */
@Entity
@Table(name = "bridge_status")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BridgeStatus {
    @Id
    private Long id;

    /** "connected" | "disconnected" | "logged_out" - whatever the bridge last reported. */
    @Column(nullable = false)
    private String status;

    @Column(name = "last_heartbeat_at", nullable = false)
    private OffsetDateTime lastHeartbeatAt;
}

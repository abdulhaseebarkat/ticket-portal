package com.plantit.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "whatsapp_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_group_id", nullable = false, unique = true)
    private String externalGroupId;

    @Column(nullable = false)
    private String name;

    @Column
    private String area;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "monitoring_enabled", nullable = false)
    private boolean monitoringEnabled;

    @Column(name = "default_category")
    private String defaultCategory;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}

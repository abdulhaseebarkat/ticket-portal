package com.plantit.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "complaints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Complaint {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "complaint_number", nullable = false, unique = true)
    private String complaintNumber;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id")
    private Equipment equipment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id")
    private Employee reporter;

    /** The WhatsApp sender's display name, captured regardless of whether they match a known Employee - reporter above requires a phone-number match, this doesn't. */
    @Column(name = "reporter_name")
    private String reporterName;

    @Column(nullable = false)
    private String source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "whatsapp_group_id")
    private WhatsAppGroup whatsappGroup;

    @Column(nullable = false)
    private String priority;

    @Column(nullable = false)
    private String status;

    @Column(name = "ai_confidence")
    private Double aiConfidence;

    @Column(name = "ai_category")
    private String aiCategory;

    @Column(name = "equipment_reference")
    private String equipmentReference;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    /** Who actually marked it resolved - the WhatsApp reply's sender, or the admin who corrected the status manually. Cleared alongside resolvedAt on a reopen. */
    @Column(name = "resolved_by")
    private String resolvedBy;

    @Column(name = "closed_at")
    private OffsetDateTime closedAt;
}

package com.plantit.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "whatsapp_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_message_id", unique = true)
    private String externalMessageId;

    @Column(name = "quoted_external_message_id")
    private String quotedExternalMessageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private WhatsAppGroup group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_employee_id")
    private Employee senderEmployee;

    @Column(name = "sender_name")
    private String senderName;

    @Column(name = "sender_whatsapp")
    private String senderWhatsapp;

    @Column(name = "message_text", columnDefinition = "TEXT")
    private String messageText;

    @Column(name = "message_type")
    private String messageType;

    @Column(name = "media_url")
    private String mediaUrl;

    @Column(name = "timestamp")
    private OffsetDateTime timestamp;

    @Column(name = "is_processed", nullable = false)
    private boolean processed;

    @Column(name = "processing_status")
    private String processingStatus;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}

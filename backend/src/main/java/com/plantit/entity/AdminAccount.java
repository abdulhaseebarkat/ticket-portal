package com.plantit.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * The single portal login account. This app has exactly one set of
 * credentials, shared by the small number of people who view the portal -
 * unrelated to the Employee table, which tracks plant staff for WhatsApp
 * complaint attribution, not portal access.
 */
@Entity
@Table(name = "admin_accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

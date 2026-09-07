package com.plantit.config;

import com.plantit.entity.AdminAccount;
import com.plantit.repository.AdminAccountRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

/**
 * Creates the one portal login account the first time the app starts
 * against an empty `admin_accounts` table. Never overwrites an existing
 * account - once it exists, change the password from inside the app
 * (Sidebar -> Change Password) instead of editing config.
 */
@Component
public class AdminAccountSeedConfig {
    private static final Logger log = LoggerFactory.getLogger(AdminAccountSeedConfig.class);

    private final AdminAccountRepository adminAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthProperties authProperties;

    public AdminAccountSeedConfig(AdminAccountRepository adminAccountRepository,
                                   PasswordEncoder passwordEncoder,
                                   AuthProperties authProperties) {
        this.adminAccountRepository = adminAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.authProperties = authProperties;
    }

    @PostConstruct
    public void seedAdminAccount() {
        if (!adminAccountRepository.findAll().isEmpty()) {
            return;
        }
        adminAccountRepository.save(AdminAccount.builder()
                .email(authProperties.getSeedEmail())
                .passwordHash(passwordEncoder.encode(authProperties.getSeedPassword()))
                .updatedAt(OffsetDateTime.now())
                .build());
        log.info("Seeded the portal login account for {}", authProperties.getSeedEmail());
    }
}

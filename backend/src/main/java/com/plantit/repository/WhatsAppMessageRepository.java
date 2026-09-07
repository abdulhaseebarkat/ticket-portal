package com.plantit.repository;

import com.plantit.entity.WhatsAppMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WhatsAppMessageRepository extends JpaRepository<WhatsAppMessage, Long> {
    Optional<WhatsAppMessage> findByExternalMessageId(String externalMessageId);

    List<WhatsAppMessage> findByGroupIdOrderByCreatedAtAsc(Long groupId);
}

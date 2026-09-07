package com.plantit.repository;

import com.plantit.entity.WhatsAppGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WhatsAppGroupRepository extends JpaRepository<WhatsAppGroup, Long> {
    Optional<WhatsAppGroup> findByExternalGroupId(String externalGroupId);
}

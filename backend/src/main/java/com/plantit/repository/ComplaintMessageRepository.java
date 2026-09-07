package com.plantit.repository;

import com.plantit.entity.ComplaintMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ComplaintMessageRepository extends JpaRepository<ComplaintMessage, Long> {
    List<ComplaintMessage> findByComplaintIdOrderByCreatedAtAsc(Long complaintId);

    Optional<ComplaintMessage> findByWhatsappMessageId(Long whatsappMessageId);

    void deleteByComplaintId(Long complaintId);
}

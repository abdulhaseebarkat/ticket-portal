package com.plantit.repository;

import com.plantit.entity.ComplaintEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComplaintEventRepository extends JpaRepository<ComplaintEvent, Long> {
    List<ComplaintEvent> findByComplaintIdOrderByCreatedAtDesc(Long complaintId);

    void deleteByComplaintId(Long complaintId);
}

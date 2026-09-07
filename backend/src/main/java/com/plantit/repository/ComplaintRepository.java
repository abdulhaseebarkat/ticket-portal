package com.plantit.repository;

import com.plantit.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    Optional<Complaint> findByComplaintNumber(String complaintNumber);

    List<Complaint> findTop20ByOrderByCreatedAtDesc();
}

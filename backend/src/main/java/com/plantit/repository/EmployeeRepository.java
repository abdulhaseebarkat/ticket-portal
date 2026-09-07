package com.plantit.repository;

import com.plantit.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByWhatsappNumber(String whatsappNumber);
}

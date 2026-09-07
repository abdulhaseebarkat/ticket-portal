package com.plantit.service.support;

import com.plantit.entity.Employee;
import com.plantit.repository.EmployeeRepository;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Shared employee-lookup helpers used by every WhatsApp ingestion path
 * (simulator, Meta Cloud webhook, and the group bridge), so the phone
 * number matching logic lives in one place.
 */
@Component
public class EmployeeLookupService {
    private final EmployeeRepository employeeRepository;

    public EmployeeLookupService(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    /**
     * Finds the Employee whose WhatsApp number matches the given phone
     * number, either exactly or by comparing the last 10 digits (to
     * tolerate country-code/formatting differences between WhatsApp's raw
     * number and however it was entered on the employee record).
     */
    public Optional<Employee> findByPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return Optional.empty();
        }
        String suffix = lastDigits(phoneNumber, 10);
        return employeeRepository.findAll().stream()
                .filter(employee -> employee.getWhatsappNumber() != null)
                .filter(employee -> employee.getWhatsappNumber().equals(phoneNumber)
                        || employee.getWhatsappNumber().endsWith(suffix))
                .findFirst();
    }

    /**
     * Treats ADMIN/SUPERVISOR roles as the IT support team, matching the
     * roles used in the seeded demo data (e.g. "IT Administrator",
     * "Supervisor").
     */
    public boolean isSupportStaff(Employee employee) {
        return employee != null
                && ("ADMIN".equalsIgnoreCase(employee.getRole()) || "SUPERVISOR".equalsIgnoreCase(employee.getRole()));
    }

    private String lastDigits(String phoneNumber, int count) {
        return phoneNumber.substring(Math.max(0, phoneNumber.length() - count));
    }
}

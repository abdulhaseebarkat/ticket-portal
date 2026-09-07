package com.plantit.service.impl;

import com.plantit.dto.EmployeeDto;
import com.plantit.entity.Employee;
import com.plantit.repository.EmployeeRepository;
import com.plantit.service.EmployeeService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EmployeeServiceImpl implements EmployeeService {
    private final EmployeeRepository employeeRepository;

    public EmployeeServiceImpl(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @Override
    public List<EmployeeDto> listAll() {
        return employeeRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public EmployeeDto create(EmployeeDto employeeDto) {
        Employee employee = Employee.builder()
                .employeeCode(employeeDto.getEmployeeCode())
                .name(employeeDto.getName())
                .department(employeeDto.getDepartment())
                .designation(employeeDto.getDesignation())
                .area(employeeDto.getArea())
                .whatsappNumber(employeeDto.getWhatsappNumber())
                .role(employeeDto.getRole())
                .active(employeeDto.isActive())
                .createdAt(java.time.OffsetDateTime.now())
                .updatedAt(java.time.OffsetDateTime.now())
                .build();
        return toDto(employeeRepository.save(employee));
    }

    @Override
    public EmployeeDto update(Long id, EmployeeDto employeeDto) {
        Employee employee = employeeRepository.findById(id).orElseThrow();
        employee.setEmployeeCode(employeeDto.getEmployeeCode());
        employee.setName(employeeDto.getName());
        employee.setDepartment(employeeDto.getDepartment());
        employee.setDesignation(employeeDto.getDesignation());
        employee.setArea(employeeDto.getArea());
        employee.setWhatsappNumber(employeeDto.getWhatsappNumber());
        employee.setRole(employeeDto.getRole());
        employee.setActive(employeeDto.isActive());
        employee.setUpdatedAt(java.time.OffsetDateTime.now());
        return toDto(employeeRepository.save(employee));
    }

    private EmployeeDto toDto(Employee employee) {
        return EmployeeDto.builder()
                .id(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .name(employee.getName())
                .department(employee.getDepartment())
                .designation(employee.getDesignation())
                .area(employee.getArea())
                .whatsappNumber(employee.getWhatsappNumber())
                .role(employee.getRole())
                .active(employee.isActive())
                .build();
    }
}

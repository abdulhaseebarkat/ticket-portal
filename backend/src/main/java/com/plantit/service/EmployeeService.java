package com.plantit.service;

import com.plantit.dto.EmployeeDto;
import com.plantit.entity.Employee;
import java.util.List;

public interface EmployeeService {
    List<EmployeeDto> listAll();
    EmployeeDto create(EmployeeDto employeeDto);
    EmployeeDto update(Long id, EmployeeDto employeeDto);
}

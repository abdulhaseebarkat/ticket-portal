package com.plantit.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeDto {
    private Long id;
    private String employeeCode;
    private String name;
    private String department;
    private String designation;
    private String area;
    private String whatsappNumber;
    private String role;
    private boolean active;
}

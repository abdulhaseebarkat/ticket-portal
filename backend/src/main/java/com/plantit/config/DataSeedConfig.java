package com.plantit.config;

import com.plantit.entity.*;
import com.plantit.repository.*;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

@Component
public class DataSeedConfig {
    private final EmployeeRepository employeeRepository;
    private final WhatsAppGroupRepository groupRepository;
    private final CategoryRepository categoryRepository;
    private final LocationRepository locationRepository;
    private final EquipmentRepository equipmentRepository;
    private final ComplaintRepository complaintRepository;

    public DataSeedConfig(EmployeeRepository employeeRepository,
                          WhatsAppGroupRepository groupRepository,
                          CategoryRepository categoryRepository,
                          LocationRepository locationRepository,
                          EquipmentRepository equipmentRepository,
                          ComplaintRepository complaintRepository) {
        this.employeeRepository = employeeRepository;
        this.groupRepository = groupRepository;
        this.categoryRepository = categoryRepository;
        this.locationRepository = locationRepository;
        this.equipmentRepository = equipmentRepository;
        this.complaintRepository = complaintRepository;
    }

    @PostConstruct
    public void initializeDemoData() {
        if (!employeeRepository.findAll().isEmpty()) {
            return;
        }

        var now = OffsetDateTime.now();

        var locations = List.of(
                Location.builder().name("Tire Building").plantArea("Tire Building").department("Production").active(true).build(),
                Location.builder().name("Curing").plantArea("Curing").department("Production").active(true).build(),
                Location.builder().name("Mixing").plantArea("Mixing").department("Production").active(true).build(),
                Location.builder().name("Warehouse").plantArea("Warehouse").department("Logistics").active(true).build(),
                Location.builder().name("Quality").plantArea("Quality").department("Quality").active(true).build(),
                Location.builder().name("Maintenance").plantArea("Maintenance").department("Support").active(true).build(),
                Location.builder().name("Administration").plantArea("Administration").department("Office").active(true).build(),
                Location.builder().name("Utilities").plantArea("Utilities").department("Facilities").active(true).build()
        );
        locationRepository.saveAll(locations);

        var categories = List.of(
                Category.builder().name("Scanner").description("Barcode scanner and handheld scanner issues").active(true).build(),
                Category.builder().name("HMI").description("Human machine interface and industrial PC issues").active(true).build(),
                Category.builder().name("Zebra Printer").description("Zebra and production label printer issues").active(true).build(),
                Category.builder().name("Network").description("LAN, Wi-Fi, switch and machine connectivity issues").active(true).build(),
                Category.builder().name("Computer").description("Desktop and operator PC issues").active(true).build(),
                Category.builder().name("Software").description("Application and software error issues").active(true).build(),
                Category.builder().name("Internet").description("Internet and external network interruptions").active(true).build(),
                Category.builder().name("Other").description("Other IT-related issues").active(true).build()
        );
        categoryRepository.saveAll(categories);

        var employees = List.of(
                Employee.builder().employeeCode("EMP-1001").name("Ahmed Khan").department("Production").designation("Machine Operator").area("Tire Building").whatsappNumber("+923001234001").role("USER").active(true).createdAt(now).updatedAt(now).build(),
                Employee.builder().employeeCode("EMP-1002").name("Sana Ali").department("Production").designation("Line Lead").area("Curing").whatsappNumber("+923001234002").role("USER").active(true).createdAt(now).updatedAt(now).build(),
                Employee.builder().employeeCode("EMP-1003").name("Bilal Ahmed").department("Maintenance").designation("Technician").area("Tire Building").whatsappNumber("+923001234003").role("USER").active(true).createdAt(now).updatedAt(now).build(),
                Employee.builder().employeeCode("EMP-1004").name("Nadia Sheikh").department("Quality").designation("Supervisor").area("Quality").whatsappNumber("+923001234004").role("USER").active(true).createdAt(now).updatedAt(now).build(),
                Employee.builder().employeeCode("EMP-1005").name("Raza Iqbal").department("IT").designation("IT Administrator").area("Administration").whatsappNumber("+923001234005").role("ADMIN").active(true).createdAt(now).updatedAt(now).build(),
                Employee.builder().employeeCode("EMP-1006").name("Sara Khan").department("IT").designation("Supervisor").area("Administration").whatsappNumber("+923001234006").role("SUPERVISOR").active(true).createdAt(now).updatedAt(now).build()
        );
        employeeRepository.saveAll(employees);

        var groups = List.of(
                WhatsAppGroup.builder().externalGroupId("group-01").name("Production IT Complaints").area("Tire Building").active(true).monitoringEnabled(true).defaultCategory("Scanner").createdAt(now).build(),
                WhatsAppGroup.builder().externalGroupId("group-02").name("Curing IT Complaints").area("Curing").active(true).monitoringEnabled(true).defaultCategory("HMI").createdAt(now).build(),
                WhatsAppGroup.builder().externalGroupId("group-03").name("Warehouse IT Complaints").area("Warehouse").active(true).monitoringEnabled(true).defaultCategory("Other").createdAt(now).build(),
                WhatsAppGroup.builder().externalGroupId("group-04").name("Maintenance IT Complaints").area("Maintenance").active(true).monitoringEnabled(true).defaultCategory("Network").createdAt(now).build(),
                WhatsAppGroup.builder().externalGroupId("group-05").name("Quality IT Complaints").area("Quality").active(true).monitoringEnabled(false).defaultCategory("Other").createdAt(now).build()
        );
        groupRepository.saveAll(groups);

        var equipment = List.of(
                Equipment.builder().equipmentCode("TB-024").name("TB-024 Scanner").type("Scanner").manufacturer("Zebra").model("DS2208").location(locations.get(0)).department("Production").active(true).build(),
                Equipment.builder().equipmentCode("TB-018").name("TB-018 Scanner").type("Scanner").manufacturer("Honeywell").model("N4310").location(locations.get(0)).department("Production").active(true).build(),
                Equipment.builder().equipmentCode("CURE-04-HMI").name("Curing HMI 04").type("HMI PC").manufacturer("Siemens").model("SIMATIC IPC").location(locations.get(1)).department("Production").active(true).build(),
                Equipment.builder().equipmentCode("ZP-02").name("Zebra Printer 02").type("Printer").manufacturer("Zebra").model("ZT220").location(locations.get(3)).department("Warehouse").active(true).build(),
                Equipment.builder().equipmentCode("WB-01").name("Warehouse Zebra Printer").type("Printer").manufacturer("Zebra").model("GK420d").location(locations.get(3)).department("Warehouse").active(true).build(),
                Equipment.builder().equipmentCode("HMI-02").name("Mixing HMI 02").type("HMI PC").manufacturer("Allen-Bradley").model("PanelView").location(locations.get(2)).department("Production").active(true).build(),
                Equipment.builder().equipmentCode("NET-SW-01").name("Network Switch 01").type("Switch").manufacturer("Cisco").model("Catalyst 9200").location(locations.get(5)).department("Network").active(true).build(),
                Equipment.builder().equipmentCode("ADM-PC-01").name("Administration PC 01").type("Desktop PC").manufacturer("Dell").model("OptiPlex 7080").location(locations.get(6)).department("Administration").active(true).build(),
                Equipment.builder().equipmentCode("UTL-WIFI-01").name("Utilities Wi-Fi Node").type("Wi-Fi").manufacturer("Ubiquiti").model("UniFi AC Pro").location(locations.get(7)).department("Utilities").active(true).build(),
                Equipment.builder().equipmentCode("QTY-MON-01").name("Quality Monitor 01").type("Monitor").manufacturer("Samsung").model("S24F350").location(locations.get(4)).department("Quality").active(true).build()
        );
        equipmentRepository.saveAll(equipment);

        var complaints = List.of(
                Complaint.builder().complaintNumber("IT-2026-1047").title("Scanner Not Working").description("TB-024 scanner ne scan karna band kar diya hai.").category(categories.get(0)).equipment(equipment.get(0)).location(locations.get(0)).reporter(employees.get(0)).source("WhatsApp").whatsappGroup(groups.get(0)).priority("HIGH").status("OPEN").aiConfidence(0.96).aiCategory("Scanner").createdAt(now.minusHours(1)).updatedAt(now.minusMinutes(20)).build(),
                Complaint.builder().complaintNumber("IT-2026-1048").title("HMI PC Hanging").description("Curing line 4 ka HMI PC bar bar hang ho raha hai.").category(categories.get(1)).equipment(equipment.get(2)).location(locations.get(1)).reporter(employees.get(1)).source("WhatsApp").whatsappGroup(groups.get(1)).priority("HIGH").status("IN_PROGRESS").aiConfidence(0.91).aiCategory("HMI").createdAt(now.minusHours(2)).updatedAt(now.minusMinutes(15)).build(),
                Complaint.builder().complaintNumber("IT-2026-1049").title("Zebra Printer Failure").description("Zebra printer 2 label print nahi kar raha.").category(categories.get(2)).equipment(equipment.get(3)).location(locations.get(3)).reporter(employees.get(0)).source("WhatsApp").whatsappGroup(groups.get(2)).priority("HIGH").status("RESOLVED").aiConfidence(0.93).aiCategory("Zebra Printer").createdAt(now.minusDays(1)).updatedAt(now.minusHours(3)).resolvedAt(now.minusHours(3)).build(),
                Complaint.builder().complaintNumber("IT-2026-1050").title("Network Outage on TB-018").description("TB-018 machine pe internet nahi chal raha.").category(categories.get(3)).equipment(equipment.get(1)).location(locations.get(0)).reporter(employees.get(0)).source("WhatsApp").whatsappGroup(groups.get(0)).priority("HIGH").status("OPEN").aiConfidence(0.94).aiCategory("Network").createdAt(now.minusHours(5)).updatedAt(now.minusHours(4)).build(),
                Complaint.builder().complaintNumber("IT-2026-1051").title("Scanner Reopened").description("Scanner abhi bhi kaam nahi kar raha.").category(categories.get(0)).equipment(equipment.get(1)).location(locations.get(0)).reporter(employees.get(0)).source("WhatsApp").whatsappGroup(groups.get(0)).priority("HIGH").status("REOPENED").aiConfidence(0.91).aiCategory("Scanner").createdAt(now.minusDays(2)).updatedAt(now.minusHours(1)).build(),
                Complaint.builder().complaintNumber("IT-2026-1052").title("Computer Login Issue").description("Assembly PC password accept nahi kar raha.").category(categories.get(4)).equipment(equipment.get(7)).location(locations.get(6)).reporter(employees.get(5)).source("WhatsApp").whatsappGroup(groups.get(4)).priority("MEDIUM").status("OPEN").aiConfidence(0.85).aiCategory("Computer").createdAt(now.minusHours(6)).updatedAt(now.minusHours(2)).build(),
                Complaint.builder().complaintNumber("IT-2026-1053").title("Wi-Fi Access Problem").description("Utilities Wi-Fi node se connection drop ho raha hai.").category(categories.get(6)).equipment(equipment.get(8)).location(locations.get(7)).reporter(employees.get(1)).source("WhatsApp").whatsappGroup(groups.get(3)).priority("MEDIUM").status("WAITING").aiConfidence(0.88).aiCategory("Internet").createdAt(now.minusHours(10)).updatedAt(now.minusHours(4)).build(),
                Complaint.builder().complaintNumber("IT-2026-1054").title("Production Printer Stalled").description("Warehouse printer 02 media jam dikhata hai.").category(categories.get(2)).equipment(equipment.get(4)).location(locations.get(3)).reporter(employees.get(3)).source("WhatsApp").whatsappGroup(groups.get(2)).priority("MEDIUM").status("RESOLVED").aiConfidence(0.92).aiCategory("Zebra Printer").createdAt(now.minusDays(1)).updatedAt(now.minusHours(5)).resolvedAt(now.minusHours(5)).build(),
                Complaint.builder().complaintNumber("IT-2026-1055").title("Software Error on HMI").description("Mixing line HMI software crash ho gaya.").category(categories.get(5)).equipment(equipment.get(5)).location(locations.get(2)).reporter(employees.get(1)).source("WhatsApp").whatsappGroup(groups.get(1)).priority("LOW").status("OPEN").aiConfidence(0.87).aiCategory("Software").createdAt(now.minusHours(8)).updatedAt(now.minusHours(7)).build(),
                Complaint.builder().complaintNumber("IT-2026-1056").title("HMI Connection Issue").description("Curing HMI 04 network disconnect ho raha hai.").category(categories.get(3)).equipment(equipment.get(2)).location(locations.get(1)).reporter(employees.get(1)).source("WhatsApp").whatsappGroup(groups.get(1)).priority("HIGH").status("IN_PROGRESS").aiConfidence(0.89).aiCategory("Network").createdAt(now.minusHours(3)).updatedAt(now.minusMinutes(35)).build()
        );
        complaintRepository.saveAll(complaints);
    }
}

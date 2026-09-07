package com.plantit.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "equipment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Equipment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "equipment_code", nullable = false, unique = true)
    private String equipmentCode;

    @Column(nullable = false)
    private String name;

    @Column
    private String type;

    @Column
    private String manufacturer;

    @Column
    private String model;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @Column
    private String department;

    @Column(nullable = false)
    private boolean active;
}

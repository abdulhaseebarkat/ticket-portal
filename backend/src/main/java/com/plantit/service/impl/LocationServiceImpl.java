package com.plantit.service.impl;

import com.plantit.dto.LocationDto;
import com.plantit.repository.LocationRepository;
import com.plantit.service.LocationService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LocationServiceImpl implements LocationService {
    private final LocationRepository locationRepository;

    public LocationServiceImpl(LocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

    @Override
    public List<LocationDto> listAll() {
        return locationRepository.findAll().stream().map(location -> LocationDto.builder()
                .id(location.getId())
                .name(location.getName())
                .plantArea(location.getPlantArea())
                .department(location.getDepartment())
                .active(location.isActive())
                .build()).collect(Collectors.toList());
    }
}

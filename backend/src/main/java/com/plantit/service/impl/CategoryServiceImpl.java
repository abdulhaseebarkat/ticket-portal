package com.plantit.service.impl;

import com.plantit.dto.CategoryDto;
import com.plantit.repository.CategoryRepository;
import com.plantit.service.CategoryService;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoryServiceImpl implements CategoryService {
    private final CategoryRepository categoryRepository;

    public CategoryServiceImpl(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Override
    public List<CategoryDto> listAll() {
        return categoryRepository.findAll().stream().map(category -> CategoryDto.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .active(category.isActive())
                .build()).collect(Collectors.toList());
    }
}

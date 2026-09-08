package com.plantit.service.impl;

import com.plantit.dto.CategoryDto;
import com.plantit.dto.CategoryRequest;
import com.plantit.entity.Category;
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
        return categoryRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public CategoryDto create(CategoryRequest request) {
        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .active(true)
                .build();
        return toDto(categoryRepository.save(category));
    }

    @Override
    public CategoryDto update(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id).orElseThrow();
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setActive(request.isActive());
        return toDto(categoryRepository.save(category));
    }

    private CategoryDto toDto(Category category) {
        return CategoryDto.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .active(category.isActive())
                .build();
    }
}

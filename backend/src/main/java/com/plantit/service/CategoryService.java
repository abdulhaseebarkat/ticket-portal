package com.plantit.service;

import com.plantit.dto.CategoryDto;
import com.plantit.dto.CategoryRequest;
import java.util.List;

public interface CategoryService {
    List<CategoryDto> listAll();

    CategoryDto create(CategoryRequest request);

    CategoryDto update(Long id, CategoryRequest request);
}

package com.plantit.config;

import com.plantit.entity.Category;
import com.plantit.repository.CategoryRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Ensures the fixed classification taxonomy exists in the database. Unlike
 * the old DataSeedConfig (removed), this isn't demo/placeholder data - the
 * complaint classifier only ever matches complaints against these category
 * names (falling back to "Other"), and never creates a missing one itself
 * (see ComplaintFactory.resolveCategory), so a category a complaint needs
 * must already exist or that complaint silently gets no category at all.
 *
 * Runs on every startup and is idempotent (find-by-name-or-create), so it's
 * safe against a database that already has some or all of these rows.
 */
@Component
public class CategorySeedConfig {
    private static final List<String> REQUIRED_CATEGORIES = List.of(
            "Scanner", "HMI", "Zebra Printer", "Network",
            "Computer", "Software", "Internet", "Other"
    );

    private final CategoryRepository categoryRepository;

    public CategorySeedConfig(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @PostConstruct
    public void ensureCategoriesExist() {
        for (String name : REQUIRED_CATEGORIES) {
            categoryRepository.findByNameIgnoreCase(name)
                    .orElseGet(() -> categoryRepository.save(Category.builder()
                            .name(name)
                            .active(true)
                            .build()));
        }
    }
}

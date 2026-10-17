package com.shoppingagent.product;

import com.shoppingagent.product.dto.CategoryDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Quản lý danh mục ngành hàng")
public class CategoryController {

    private final CategoryRepository categoryRepository;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả ngành hàng active")
    public ResponseEntity<List<CategoryDTO>> getCategories() {
        List<CategoryDTO> list = categoryRepository.findAll().stream()
                .filter(c -> Boolean.TRUE.equals(c.getIsActive()))
                .map(c -> CategoryDTO.builder()
                        .id(c.getId())
                        .code(c.getCode())
                        .name(c.getName())
                        .description(c.getDescription())
                        .build())
                .toList();
        return ResponseEntity.ok(list);
    }
}

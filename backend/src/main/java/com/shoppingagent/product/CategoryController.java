package com.shoppingagent.product;

import com.shoppingagent.product.dto.CategoryCreateRequest;
import com.shoppingagent.product.dto.CategoryDTO;
import com.shoppingagent.product.dto.CategoryUpdateRequest;
import com.shoppingagent.shared.entity.Category;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Quản lý danh mục ngành hàng")
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final CategoryFacetService categoryFacetService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả ngành hàng (mặc định chỉ active, thêm includeInactive=true để lấy tất cả)")
    public ResponseEntity<List<CategoryDTO>> getCategories(
            @RequestParam(required = false, defaultValue = "false") boolean includeInactive) {
        List<CategoryDTO> list = categoryRepository.findAll().stream()
                .filter(c -> includeInactive || Boolean.TRUE.equals(c.getIsActive()))
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{code}/facets")
    @Operation(summary = "Lấy cấu hình bộ lọc động theo ngành hàng (Metadata-driven facets)")
    public ResponseEntity<List<com.shoppingagent.product.dto.CategoryFacetDTO>> getCategoryFacets(
            @PathVariable String code) {
        return ResponseEntity.ok(categoryFacetService.getFacetsForCategory(code));
    }

    @PostMapping
    @Operation(summary = "Tạo mới ngành hàng")
    public ResponseEntity<CategoryDTO> createCategory(@RequestBody CategoryCreateRequest req) {
        if (req.getCode() == null || req.getCode().isBlank()) {
            throw new IllegalArgumentException("Mã ngành hàng không được để trống");
        }
        String cleanCode = req.getCode().trim().toLowerCase();
        if (categoryRepository.findByCode(cleanCode).isPresent()) {
            throw new IllegalArgumentException("Mã ngành hàng đã tồn tại: " + cleanCode);
        }

        Category cat = Category.builder()
                .code(cleanCode)
                .name(req.getName() != null ? req.getName().trim() : cleanCode)
                .description(req.getDescription())
                .isActive(true)
                .build();
        categoryRepository.save(cat);
        return ResponseEntity.ok(toDTO(cat));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin ngành hàng")
    public ResponseEntity<CategoryDTO> updateCategory(
            @PathVariable Integer id,
            @RequestBody CategoryUpdateRequest req) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành hàng với ID: " + id));

        if (req.getName() != null) cat.setName(req.getName().trim());
        if (req.getDescription() != null) cat.setDescription(req.getDescription());
        if (req.getIsActive() != null) cat.setIsActive(req.getIsActive());

        categoryRepository.save(cat);
        return ResponseEntity.ok(toDTO(cat));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Vô hiệu hóa ngành hàng")
    public ResponseEntity<Void> deleteCategory(@PathVariable Integer id) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành hàng với ID: " + id));
        cat.setIsActive(false);
        categoryRepository.save(cat);
        return ResponseEntity.noContent().build();
    }

    private CategoryDTO toDTO(Category c) {
        return CategoryDTO.builder()
                .id(c.getId())
                .code(c.getCode())
                .name(c.getName())
                .description(c.getDescription())
                .isActive(c.getIsActive())
                .build();
    }
}

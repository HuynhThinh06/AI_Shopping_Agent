package com.shoppingagent.product;

import com.shoppingagent.audit.AuditAction;
import com.shoppingagent.audit.AuditLogService;
import com.shoppingagent.product.dto.CategoryAttributeDTO;
import com.shoppingagent.product.dto.CategoryCreateRequest;
import com.shoppingagent.product.dto.CategoryDTO;
import com.shoppingagent.product.dto.CategoryUpdateRequest;
import com.shoppingagent.shared.entity.Category;
import com.shoppingagent.shared.entity.CategoryAttribute;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Quản lý danh mục ngành hàng và thuộc tính lọc GIN")
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final CategoryAttributeRepository categoryAttributeRepository;
    private final CategoryFacetService categoryFacetService;
    private final AuditLogService auditLogService;

    @GetMapping
    @org.springframework.cache.annotation.Cacheable(value = "categories", key = "#includeInactive")
    @Operation(summary = "Lấy danh sách tất cả ngành hàng kèm các thuộc tính lọc GIN")
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
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"categories", "categoryFacets"}, allEntries = true)
    @Operation(summary = "Tạo mới ngành hàng (kèm danh sách thuộc tính tùy chọn)")
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
        Category saved = categoryRepository.save(cat);

        if (req.getAttributes() != null && !req.getAttributes().isEmpty()) {
            saveCategoryAttributes(saved, req.getAttributes(), false);
        }

        if (auditLogService != null) {
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("code", saved.getCode());
            details.put("name", saved.getName());
            details.put("description", saved.getDescription());
            details.put("attributesCount", req.getAttributes() != null ? req.getAttributes().size() : 0);
            auditLogService.log(AuditAction.CATEGORY_CREATE, "CATEGORY", saved.getId(),
                    "Tạo mới ngành hàng '" + saved.getName() + "' (" + saved.getCode() + ")", details);
        }

        return ResponseEntity.ok(toDTO(saved));
    }

    @PutMapping("/{id}")
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"categories", "categoryFacets"}, allEntries = true)
    @Operation(summary = "Cập nhật thông tin ngành hàng và danh sách thuộc tính")
    public ResponseEntity<CategoryDTO> updateCategory(
            @PathVariable Integer id,
            @RequestBody CategoryUpdateRequest req) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành hàng với ID: " + id));

        Map<String, Object> beforeState = new LinkedHashMap<>();
        beforeState.put("name", cat.getName());
        beforeState.put("description", cat.getDescription());
        beforeState.put("isActive", cat.getIsActive());

        if (req.getName() != null) cat.setName(req.getName().trim());
        if (req.getDescription() != null) cat.setDescription(req.getDescription());
        if (req.getIsActive() != null) cat.setIsActive(req.getIsActive());

        Category saved = categoryRepository.save(cat);

        if (req.getAttributes() != null) {
            saveCategoryAttributes(saved, req.getAttributes(), true);
        }

        if (auditLogService != null) {
            Map<String, Object> afterState = new LinkedHashMap<>();
            afterState.put("name", saved.getName());
            afterState.put("description", saved.getDescription());
            afterState.put("isActive", saved.getIsActive());
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("code", saved.getCode());
            details.put("before", beforeState);
            details.put("after", afterState);
            auditLogService.log(AuditAction.CATEGORY_UPDATE, "CATEGORY", saved.getId(),
                    "Cập nhật ngành hàng '" + saved.getName() + "' (" + saved.getCode() + ")", details);
        }

        return ResponseEntity.ok(toDTO(saved));
    }

    @PostMapping("/{id}/attributes")
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"categories", "categoryFacets"}, allEntries = true)
    @Operation(summary = "Thêm hoặc cập nhật một thuộc tính lọc GIN cho ngành hàng")
    public ResponseEntity<CategoryDTO> addCategoryAttribute(
            @PathVariable Integer id,
            @RequestBody CategoryAttributeDTO attrReq) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành hàng với ID: " + id));

        if (attrReq.getAttributeKey() == null || attrReq.getAttributeKey().isBlank()) {
            throw new IllegalArgumentException("Khóa thuộc tính (attributeKey) không được để trống");
        }

        String cleanKey = attrReq.getAttributeKey().trim().toLowerCase().replaceAll("\\s+", "_");
        String cleanLabel = (attrReq.getAttributeLabel() != null && !attrReq.getAttributeLabel().isBlank())
                ? attrReq.getAttributeLabel().trim()
                : cleanKey;
        String cleanType = normalizeDataType(attrReq.getDataType());

        Optional<CategoryAttribute> existingOpt = categoryAttributeRepository
                .findByCategoryIdAndAttributeKeyIgnoreCase(id, cleanKey);

        CategoryAttribute attr;
        if (existingOpt.isPresent()) {
            attr = existingOpt.get();
            attr.setAttributeLabel(cleanLabel);
            attr.setUnit(attrReq.getUnit());
            attr.setDataType(cleanType);
            attr.setIsFilterable(attrReq.getIsFilterable() != null ? attrReq.getIsFilterable() : true);
            if (attrReq.getDisplayOrder() != null) {
                attr.setDisplayOrder(attrReq.getDisplayOrder());
            }
        } else {
            List<CategoryAttribute> currentAttrs = categoryAttributeRepository
                    .findByCategoryIdOrderByDisplayOrderAscIdAsc(id);
            int nextOrder = attrReq.getDisplayOrder() != null
                    ? attrReq.getDisplayOrder()
                    : (currentAttrs.size() + 1);
            attr = CategoryAttribute.builder()
                    .category(cat)
                    .attributeKey(cleanKey)
                    .attributeLabel(cleanLabel)
                    .unit(attrReq.getUnit())
                    .dataType(cleanType)
                    .isFilterable(attrReq.getIsFilterable() != null ? attrReq.getIsFilterable() : true)
                    .displayOrder(nextOrder)
                    .build();
        }
        CategoryAttribute savedAttr = categoryAttributeRepository.save(attr);

        if (auditLogService != null) {
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("categoryCode", cat.getCode());
            details.put("attributeId", savedAttr.getId());
            details.put("attributeKey", cleanKey);
            details.put("attributeLabel", cleanLabel);
            details.put("dataType", cleanType);
            details.put("unit", savedAttr.getUnit());
            details.put("isFilterable", savedAttr.getIsFilterable());
            auditLogService.log(AuditAction.CATEGORY_ATTRIBUTE_ADD, "CATEGORY", cat.getId(),
                    "Cập nhật/thêm thuộc tính '" + cleanKey + "' cho ngành hàng '" + cat.getName() + "'", details);
        }

        return ResponseEntity.ok(toDTO(cat));
    }

    @DeleteMapping("/{id}/attributes/{attrId}")
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"categories", "categoryFacets"}, allEntries = true)
    @Operation(summary = "Xóa một thuộc tính lọc khỏi ngành hàng")
    public ResponseEntity<CategoryDTO> deleteCategoryAttribute(
            @PathVariable Integer id,
            @PathVariable Integer attrId) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành hàng với ID: " + id));

        categoryAttributeRepository.findById(attrId).ifPresent(attr -> {
            if (attr.getCategory() != null && id.equals(attr.getCategory().getId())) {
                String attrKey = attr.getAttributeKey();
                String attrLabel = attr.getAttributeLabel();
                categoryAttributeRepository.delete(attr);
                if (auditLogService != null) {
                    Map<String, Object> details = new LinkedHashMap<>();
                    details.put("categoryCode", cat.getCode());
                    details.put("attributeId", attrId);
                    details.put("attributeKey", attrKey);
                    details.put("attributeLabel", attrLabel);
                    auditLogService.log(AuditAction.CATEGORY_ATTRIBUTE_DELETE, "CATEGORY", cat.getId(),
                            "Xóa thuộc tính '" + attrKey + "' khỏi ngành hàng '" + cat.getName() + "'", details);
                }
            }
        });
        return ResponseEntity.ok(toDTO(cat));
    }

    @PutMapping("/{id}/activate")
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"categories", "categoryFacets"}, allEntries = true)
    @Operation(summary = "Kích hoạt lại ngành hàng")
    public ResponseEntity<CategoryDTO> activateCategory(@PathVariable Integer id) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành hàng với ID: " + id));
        boolean beforeActive = Boolean.TRUE.equals(cat.getIsActive());
        cat.setIsActive(true);
        Category saved = categoryRepository.save(cat);

        if (auditLogService != null) {
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("code", cat.getCode());
            details.put("name", cat.getName());
            details.put("beforeActive", beforeActive);
            details.put("afterActive", true);
            auditLogService.log(AuditAction.CATEGORY_UPDATE, "CATEGORY", cat.getId(),
                    "Kích hoạt lại ngành hàng '" + cat.getName() + "' (" + cat.getCode() + ")", details);
        }

        return ResponseEntity.ok(toDTO(saved));
    }

    @DeleteMapping("/{id}")
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"categories", "categoryFacets"}, allEntries = true)
    @Operation(summary = "Vô hiệu hóa ngành hàng")
    public ResponseEntity<Void> deleteCategory(@PathVariable Integer id) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành hàng với ID: " + id));
        boolean beforeActive = Boolean.TRUE.equals(cat.getIsActive());
        cat.setIsActive(false);
        categoryRepository.save(cat);

        if (auditLogService != null) {
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("code", cat.getCode());
            details.put("name", cat.getName());
            details.put("beforeActive", beforeActive);
            details.put("afterActive", false);
            auditLogService.log(AuditAction.CATEGORY_DELETE, "CATEGORY", cat.getId(),
                    "Vô hiệu hóa ngành hàng '" + cat.getName() + "' (" + cat.getCode() + ")", details);
        }

        return ResponseEntity.noContent().build();
    }

    private void saveCategoryAttributes(Category cat, List<CategoryAttributeDTO> dtos, boolean replaceExisting) {
        if (replaceExisting && cat.getId() != null) {
            List<CategoryAttribute> existing = categoryAttributeRepository
                    .findByCategoryIdOrderByDisplayOrderAscIdAsc(cat.getId());
            if (!existing.isEmpty()) {
                categoryAttributeRepository.deleteAll(existing);
                categoryAttributeRepository.flush();
            }
        }

        int order = 1;
        for (CategoryAttributeDTO dto : dtos) {
            if (dto.getAttributeKey() == null || dto.getAttributeKey().isBlank()) continue;
            String cleanKey = dto.getAttributeKey().trim().toLowerCase().replaceAll("\\s+", "_");
            String cleanLabel = (dto.getAttributeLabel() != null && !dto.getAttributeLabel().isBlank())
                    ? dto.getAttributeLabel().trim()
                    : cleanKey;
            CategoryAttribute attr = CategoryAttribute.builder()
                    .category(cat)
                    .attributeKey(cleanKey)
                    .attributeLabel(cleanLabel)
                    .unit(dto.getUnit())
                    .dataType(normalizeDataType(dto.getDataType()))
                    .isFilterable(dto.getIsFilterable() != null ? dto.getIsFilterable() : true)
                    .displayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : order++)
                    .build();
            categoryAttributeRepository.save(attr);
        }
    }

    private String normalizeDataType(String rawType) {
        if (rawType == null || rawType.isBlank()) return "text";
        String lower = rawType.trim().toLowerCase();
        if (lower.equals("numeric") || lower.equals("number")) return "number";
        if (lower.equals("boolean") || lower.equals("bool")) return "boolean";
        return "text";
    }

    private CategoryDTO toDTO(Category c) {
        List<CategoryAttributeDTO> attrDtos = Collections.emptyList();
        if (c.getId() != null) {
            attrDtos = categoryAttributeRepository
                    .findByCategoryIdOrderByDisplayOrderAscIdAsc(c.getId())
                    .stream()
                    .map(a -> CategoryAttributeDTO.builder()
                            .id(a.getId())
                            .attributeKey(a.getAttributeKey())
                            .attributeLabel(a.getAttributeLabel())
                            .unit(a.getUnit())
                            .dataType(a.getDataType())
                            .isFilterable(a.getIsFilterable())
                            .displayOrder(a.getDisplayOrder())
                            .build())
                    .toList();
        }

        return CategoryDTO.builder()
                .id(c.getId())
                .code(c.getCode())
                .name(c.getName())
                .description(c.getDescription())
                .isActive(c.getIsActive())
                .attributes(attrDtos)
                .build();
    }
}

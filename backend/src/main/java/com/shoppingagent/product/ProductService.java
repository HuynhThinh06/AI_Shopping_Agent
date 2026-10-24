package com.shoppingagent.product;

import com.shoppingagent.audit.AuditAction;
import com.shoppingagent.audit.AuditLogService;
import com.shoppingagent.product.dto.ProductCreateRequest;
import com.shoppingagent.product.dto.ProductDetailDTO;
import com.shoppingagent.shared.entity.Category;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.ProductImage;
import com.shoppingagent.shared.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductImageRepository productImageRepository;
    private final CloudinaryService cloudinaryService;
    private final AuditLogService auditLogService;

    @org.springframework.cache.annotation.Cacheable(value = "productDetails", key = "#id")
    public ProductDetailDTO getById(Long id) {
        Product p = productRepository.findDetailById(id)
                .orElseGet(() -> productRepository.findById(id)
                        .orElseThrow(() -> new ProductNotFoundException(id)));
        return toDetailDTO(p);
    }

    @org.springframework.cache.annotation.Cacheable(value = "featuredProducts", key = "#limit")
    public List<ProductDetailDTO> getFeaturedProducts(int limit) {
        Pageable pageable = PageRequest.of(0, Math.min(Math.max(limit, 1), 30), Sort.by("avgRating").descending());
        List<Product> products = productRepository.findFeaturedProducts(pageable).getContent();
        if (products.isEmpty()) return Collections.emptyList();

        List<Long> productIds = products.stream().map(Product::getId).collect(Collectors.toList());
        Map<Long, List<String>> imageMap = productImageRepository.findByProductIds(productIds).stream()
                .collect(Collectors.groupingBy(
                        pi -> pi.getProduct().getId(),
                        Collectors.mapping(ProductImage::getImageUrl, Collectors.toList())
                ));

        return products.stream()
                .map(p -> toDetailDTO(p, imageMap.getOrDefault(p.getId(), Collections.emptyList())))
                .collect(Collectors.toList());
    }

    public List<ProductDetailDTO> getProductsForComparison(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }
        List<Product> products = productRepository.findByIdIn(ids);
        if (products.isEmpty()) return Collections.emptyList();

        List<Long> productIds = products.stream().map(Product::getId).collect(Collectors.toList());
        Map<Long, List<String>> imageMap = productImageRepository.findByProductIds(productIds).stream()
                .collect(Collectors.groupingBy(
                        pi -> pi.getProduct().getId(),
                        Collectors.mapping(ProductImage::getImageUrl, Collectors.toList())
                ));

        return products.stream()
                .map(p -> toDetailDTO(p, imageMap.getOrDefault(p.getId(), Collections.emptyList())))
                .collect(Collectors.toList());
    }

    /**
     * [MỚI - B7] Tìm kiếm sản phẩm với filter tùy chọn + phân trang.
     *
     * Tất cả tham số filter đều nullable:
     *   - categoryCode null → không lọc theo ngành hàng
     *   - minPrice / maxPrice null → không giới hạn giá
     *   - keyword null → không lọc theo tên/hãng
     *
     * Mặc định sắp xếp: avg_rating giảm dần (sản phẩm được đánh giá cao lên trước).
     *
     * @param page  Số trang, bắt đầu từ 0
     * @param size  Số sản phẩm mỗi trang (Controller giới hạn tối đa 50)
     */
    public Page<ProductDetailDTO> searchProducts(String categoryCode,
                                                  Long   minPrice,
                                                  Long   maxPrice,
                                                  String keyword,
                                                  int    page,
                                                  int    size) {
        return searchProducts(categoryCode, minPrice, maxPrice, keyword, page, size, false);
    }

    public Page<ProductDetailDTO> searchProducts(String  categoryCode,
                                                  Long    minPrice,
                                                  Long    maxPrice,
                                                  String  keyword,
                                                  int     page,
                                                  int     size,
                                                  boolean includeInactive) {
        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by("avgRating").descending()
        );
        String cleanCategory = (categoryCode != null && !categoryCode.isBlank()) ? categoryCode.trim() : "";
        String cleanKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : "";
        Page<Product> productPage = includeInactive
                ? productRepository.searchProductsWithInactive(cleanCategory, minPrice, maxPrice, cleanKeyword, true, pageable)
                : productRepository.searchProducts(cleanCategory, minPrice, maxPrice, cleanKeyword, pageable);

        if (productPage.isEmpty()) {
            return Page.empty(pageable);
        }

        // Tối ưu Batch: Lấy toàn bộ ảnh của các sản phẩm trong trang bằng đúng 1 câu SQL IN duy nhất
        List<Long> productIds = productPage.getContent().stream().map(Product::getId).collect(Collectors.toList());
        Map<Long, List<String>> imageMap = productImageRepository.findByProductIds(productIds).stream()
                .collect(Collectors.groupingBy(
                        pi -> pi.getProduct().getId(),
                        Collectors.mapping(ProductImage::getImageUrl, Collectors.toList())
                ));

        return productPage.map(p -> toDetailDTO(p, imageMap.getOrDefault(p.getId(), Collections.emptyList())));
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"featuredProducts", "categoryFacets", "productDetails", "adminSystemStats", "adminDashboardStats"}, allEntries = true)
    public ProductDetailDTO createProduct(ProductCreateRequest request, List<MultipartFile> images) {
        Category category = categoryRepository.findByCode(request.getCategoryCode())
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + request.getCategoryCode()));

        String cleanSku = (request.getSku() != null && !request.getSku().isBlank())
                ? request.getSku().trim()
                : null;
        if (cleanSku != null && productRepository.findBySku(cleanSku).isPresent()) {
            throw new IllegalArgumentException("Mã SKU '" + cleanSku + "' đã tồn tại trong hệ thống. Vui lòng chọn mã SKU khác.");
        }

        Product product = Product.builder()
                .category(category)
                .sku(cleanSku)
                .name(request.getName())
                .brand(request.getBrand())
                .price(request.getPrice())
                .stockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 10)
                .productUrl(request.getProductUrl())
                .specs(request.getSpecs() != null ? request.getSpecs() : Collections.emptyMap())
                .isActive(true)
                .build();

        List<ProductImage> productImages = new ArrayList<>();
        boolean isFirst = true;

        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            for (String url : request.getImageUrls()) {
                if (url != null && !url.isBlank()) {
                    productImages.add(ProductImage.builder()
                            .product(product)
                            .imageUrl(url.trim())
                            .isPrimary(isFirst)
                            .build());
                    isFirst = false;
                }
            }
        }

        if (images != null && !images.isEmpty()) {
            for (MultipartFile file : images) {
                if (file != null && !file.isEmpty()) {
                    try {
                        String url = cloudinaryService.uploadImage(file);
                        ProductImage img = ProductImage.builder()
                                .product(product)
                                .imageUrl(url)
                                .isPrimary(isFirst)
                                .build();
                        productImages.add(img);
                        isFirst = false;
                    } catch (IOException e) {
                        log.error("Error uploading image to Cloudinary", e);
                        throw new RuntimeException("Failed to upload image", e);
                    }
                }
            }
        }
        product.setImages(productImages);

        Product saved = productRepository.save(product);

        if (auditLogService != null) {
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("sku", saved.getSku());
            details.put("name", saved.getName());
            details.put("brand", saved.getBrand());
            details.put("categoryCode", category.getCode());
            details.put("price", saved.getPrice());
            details.put("stockQuantity", saved.getStockQuantity());
            auditLogService.log(AuditAction.PRODUCT_CREATE, "PRODUCT", saved.getId(),
                    "Thêm mới sản phẩm '" + saved.getName() + "' (SKU: " + saved.getSku() + ")", details);
        }

        return toDetailDTO(saved);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"featuredProducts", "categoryFacets", "productDetails", "adminSystemStats", "adminDashboardStats"}, allEntries = true)
    public ProductDetailDTO updateProduct(Long id, com.shoppingagent.product.dto.ProductUpdateRequest request, List<MultipartFile> images) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));

        Map<String, Object> beforeState = new LinkedHashMap<>();
        beforeState.put("name", product.getName());
        beforeState.put("brand", product.getBrand());
        beforeState.put("sku", product.getSku());
        beforeState.put("price", product.getPrice());
        beforeState.put("stockQuantity", product.getStockQuantity());
        beforeState.put("isActive", product.getIsActive());

        if (request.getCategoryCode() != null && !request.getCategoryCode().isBlank()) {
            Category category = categoryRepository.findByCode(request.getCategoryCode())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found: " + request.getCategoryCode()));
            product.setCategory(category);
        }

        if (request.getName() != null) product.setName(request.getName());
        if (request.getBrand() != null) product.setBrand(request.getBrand());
        if (request.getSku() != null) {
            String cleanSku = !request.getSku().isBlank() ? request.getSku().trim() : null;
            if (cleanSku != null) {
                productRepository.findBySku(cleanSku).ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new IllegalArgumentException("Mã SKU '" + cleanSku + "' đã được sử dụng bởi sản phẩm khác (#" + existing.getId() + " - " + existing.getName() + ").");
                    }
                });
            }
            product.setSku(cleanSku);
        }
        if (request.getPrice() != null) product.setPrice(request.getPrice());
        if (request.getStockQuantity() != null) product.setStockQuantity(request.getStockQuantity());
        if (request.getProductUrl() != null) product.setProductUrl(request.getProductUrl());
        if (request.getSpecs() != null) product.setSpecs(request.getSpecs());
        if (request.getIsActive() != null) product.setIsActive(request.getIsActive());

        if (product.getImages() == null) {
            product.setImages(new ArrayList<>());
        }

        if (request.getImageUrls() != null) {
            product.getImages().clear();
            boolean isFirst = true;
            for (String url : request.getImageUrls()) {
                if (url != null && !url.isBlank()) {
                    product.getImages().add(ProductImage.builder()
                            .product(product)
                            .imageUrl(url.trim())
                            .isPrimary(isFirst)
                            .build());
                    isFirst = false;
                }
            }
        }

        if (images != null && !images.isEmpty()) {
            boolean isFirst = product.getImages().isEmpty();
            for (MultipartFile file : images) {
                if (file != null && !file.isEmpty()) {
                    try {
                        String url = cloudinaryService.uploadImage(file);
                        ProductImage img = ProductImage.builder()
                                .product(product)
                                .imageUrl(url)
                                .isPrimary(isFirst)
                                .build();
                        product.getImages().add(img);
                        isFirst = false;
                    } catch (IOException e) {
                        log.error("Error uploading image to Cloudinary", e);
                        throw new RuntimeException("Failed to upload image", e);
                    }
                }
            }
        }

        Product saved = productRepository.save(product);

        if (auditLogService != null) {
            Map<String, Object> afterState = new LinkedHashMap<>();
            afterState.put("name", saved.getName());
            afterState.put("brand", saved.getBrand());
            afterState.put("sku", saved.getSku());
            afterState.put("price", saved.getPrice());
            afterState.put("stockQuantity", saved.getStockQuantity());
            afterState.put("isActive", saved.getIsActive());

            Map<String, Object> details = new LinkedHashMap<>();
            details.put("before", beforeState);
            details.put("after", afterState);
            auditLogService.log(AuditAction.PRODUCT_UPDATE, "PRODUCT", saved.getId(),
                    "Cập nhật sản phẩm #" + saved.getId() + " ('" + saved.getName() + "')", details);
        }

        return toDetailDTO(saved);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"featuredProducts", "categoryFacets", "productDetails", "adminSystemStats", "adminDashboardStats"}, allEntries = true)
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));
        boolean beforeActive = Boolean.TRUE.equals(product.getIsActive());
        product.setIsActive(false);
        productRepository.save(product);
        log.info("Product #{} marked as inactive (soft deleted)", id);

        if (auditLogService != null) {
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("sku", product.getSku());
            details.put("name", product.getName());
            details.put("beforeActive", beforeActive);
            details.put("afterActive", false);
            auditLogService.log(AuditAction.PRODUCT_DELETE, "PRODUCT", id,
                    "Ngừng bán (xóa mềm) sản phẩm #" + id + " ('" + product.getName() + "')", details);
        }
    }

    private ProductDetailDTO toDetailDTO(Product p, List<String> imageUrls) {
        return ProductDetailDTO.builder()
                .id(p.getId())
                .categoryCode(p.getCategory() != null ? p.getCategory().getCode() : null)
                .sku(p.getSku())
                .name(p.getName())
                .brand(p.getBrand())
                .price(p.getPrice())
                .stockQuantity(p.getStockQuantity())
                .isActive(p.getIsActive())
                .productUrl(p.getProductUrl())
                .avgRating(p.getAvgRating())
                .reviewCount(p.getReviewCount())
                .specs(p.getSpecs())
                .imageUrls(imageUrls != null ? imageUrls : Collections.emptyList())
                .build();
    }

    private ProductDetailDTO toDetailDTO(Product p) {
        List<String> imageUrls = p.getImages() != null ? 
                p.getImages().stream().map(ProductImage::getImageUrl).collect(Collectors.toList()) : 
                new ArrayList<>();
        return toDetailDTO(p, imageUrls);
    }
}

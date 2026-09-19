package com.shoppingagent.seed;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shoppingagent.seed.dto.ProductSeedRequest;
import com.shoppingagent.shared.entity.Category;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.ProductImage;
import com.shoppingagent.shared.service.CloudinaryService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SeedService {

    private final EntityManager entityManager;
    private final CloudinaryService cloudinaryService;
    private final ObjectMapper objectMapper;

    @Transactional
    public Product seedProduct(String productDataJson, MultipartFile[] images) throws IOException {
        // 1. Parse JSON to DTO
        ProductSeedRequest request = objectMapper.readValue(productDataJson, ProductSeedRequest.class);
        log.info("Seeding product: {}", request.getName());

        // 2. Resolve Category
        Category category = resolveCategory(request.getCategoryCode());

        // 3. Create Product entity
        Product product = Product.builder()
                .category(category)
                .sku(request.getSku())
                .name(request.getName())
                .brand(request.getBrand())
                .price(request.getPrice())
                .productUrl(request.getProductUrl())
                .avgRating(request.getAvgRating())
                .reviewCount(request.getReviewCount() != null ? request.getReviewCount() : 0)
                .specs(request.getSpecs())
                .build();

        entityManager.persist(product);

        // 4. Upload and Save Images
        if (images != null && images.length > 0) {
            for (int i = 0; i < images.length; i++) {
                MultipartFile file = images[i];
                if (!file.isEmpty()) {
                    String secureUrl = cloudinaryService.uploadImage(file);
                    ProductImage productImage = ProductImage.builder()
                            .product(product)
                            .imageUrl(secureUrl)
                            .isPrimary(i == 0) // First image is primary
                            .build();
                    entityManager.persist(productImage);
                }
            }
        }

        return product;
    }

    private Category resolveCategory(String categoryCode) {
        if (categoryCode == null || categoryCode.isBlank()) {
            throw new IllegalArgumentException("categoryCode cannot be null or empty");
        }
        
        List<Category> categories = entityManager.createQuery("SELECT c FROM Category c WHERE c.code = :code", Category.class)
                .setParameter("code", categoryCode)
                .getResultList();

        if (categories.isEmpty()) {
            // Create a new category if it doesn't exist
            Category category = Category.builder()
                    .code(categoryCode)
                    .name(categoryCode) // default name
                    .isActive(true)
                    .build();
            entityManager.persist(category);
            return category;
        }

        return categories.get(0);
    }
}

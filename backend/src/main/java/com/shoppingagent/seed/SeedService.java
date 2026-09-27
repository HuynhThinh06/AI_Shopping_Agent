package com.shoppingagent.seed;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shoppingagent.seed.dto.ProductSeedRequest;
import com.shoppingagent.seed.dto.ReviewSeedRequest;
import com.shoppingagent.shared.entity.Category;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.ProductImage;
import com.shoppingagent.shared.entity.Review;
import com.shoppingagent.shared.entity.User;
import com.shoppingagent.shared.service.CloudinaryService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SeedService {

    private final EntityManager entityManager;
    private final CloudinaryService cloudinaryService;
    private final ObjectMapper objectMapper;

    @Transactional
    public Product seedProduct(String productDataJson, MultipartFile[] images) throws IOException {
        ProductSeedRequest request = objectMapper.readValue(productDataJson, ProductSeedRequest.class);
        log.info("Seeding product: {}", request.getName());

        List<Product> existingProducts = entityManager.createQuery("SELECT p FROM Product p WHERE p.productUrl = :url", Product.class)
                .setParameter("url", request.getProductUrl())
                .getResultList();
        if (!existingProducts.isEmpty()) {
            log.info("Product already exists, skipping: {}", request.getProductUrl());
            return existingProducts.get(0);
        }

        Category category = resolveCategory(request.getCategoryCode());

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

        if (images != null && images.length > 0) {
            for (int i = 0; i < images.length; i++) {
                MultipartFile file = images[i];
                if (!file.isEmpty()) {
                    String secureUrl = cloudinaryService.uploadImage(file);
                    ProductImage productImage = ProductImage.builder()
                            .product(product)
                            .imageUrl(secureUrl)
                            .isPrimary(i == 0)
                            .build();
                    entityManager.persist(productImage);
                }
            }
        }

        // Seeding reviews nếu có
        if (request.getReviews() != null && !request.getReviews().isEmpty()) {
            User defaultCrawlerUser = resolveDefaultCrawlerUser();
            for (ReviewSeedRequest revReq : request.getReviews()) {
                Review review = Review.builder()
                        .product(product)
                        .user(defaultCrawlerUser)
                        .reviewerName(revReq.getReviewerName())
                        .content(revReq.getContent())
                        .rating(revReq.getRating())
                        .isSpam(false)
                        .isActive(true)
                        .build();
                entityManager.persist(review);
            }
            log.info("Seeded {} reviews for product: {}", request.getReviews().size(), request.getName());
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
            Category category = Category.builder()
                    .code(categoryCode)
                    .name(categoryCode) 
                    .isActive(true)
                    .build();
            entityManager.persist(category);
            return category;
        }

        return categories.get(0);
    }

    private User resolveDefaultCrawlerUser() {
        List<User> users = entityManager.createQuery("SELECT u FROM User u WHERE u.username = :username", User.class)
                .setParameter("username", "crawler")
                .getResultList();
        if (!users.isEmpty()) {
            return users.get(0);
        }
        User crawler = User.builder()
                .username("crawler")
                .email("crawler@system.local")
                .passwordHash("N/A")
                .displayName("System Crawler")
                .role("admin")
                .isActive(true)
                .build();
        entityManager.persist(crawler);
        return crawler;
    }
}

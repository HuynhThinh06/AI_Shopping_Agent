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

    public List<com.shoppingagent.seed.dto.ProductSimpleDTO> getAllProducts() {
        return entityManager.createQuery("SELECT new com.shoppingagent.seed.dto.ProductSimpleDTO(p.id, p.productUrl) FROM Product p", com.shoppingagent.seed.dto.ProductSimpleDTO.class)
                .getResultList();
    }

    @Transactional
    public void seedReviewsForProduct(Long productId, List<ReviewSeedRequest> reviews) {
        Product product = entityManager.find(Product.class, productId);
        if (product == null) {
            throw new IllegalArgumentException("Product not found with ID: " + productId);
        }

        User defaultCrawlerUser = resolveDefaultCrawlerUser();
        for (ReviewSeedRequest revReq : reviews) {
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
        
        // Update review count and avgRating on product
        Long count = entityManager.createQuery("SELECT COUNT(r) FROM Review r WHERE r.product.id = :pid", Long.class)
                .setParameter("pid", productId)
                .getSingleResult();
        
        Double avg = entityManager.createQuery("SELECT AVG(r.rating) FROM Review r WHERE r.product.id = :pid", Double.class)
                .setParameter("pid", productId)
                .getSingleResult();
                
        product.setReviewCount(count.intValue());
        if (avg != null) {
            product.setAvgRating(java.math.BigDecimal.valueOf(avg).setScale(1, java.math.RoundingMode.HALF_UP));
        }
        entityManager.merge(product);
        
        log.info("Seeded {} reviews for product: {}", reviews.size(), product.getName());
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

    @Transactional
    public List<User> seedDefaultUsers() {
        record UserData(String username, String email, String passwordHash, String displayName, String role, boolean isActive) {}

        List<UserData> defaultUsers = List.of(
            new UserData("admin", "admin@shoppingagent.com", "$2a$10$R0tBJjKn5yR4FutIJV73OurD/w0Bfz0Mi6gplX3JigptulQj3NE3.", "Quản trị viên Hệ thống (Admin)", "admin", true),
            new UserData("tuananh", "tuananh.dev@gmail.com", "$2a$10$.J7MALTe9SrRBVXXO35rKuGJy2jNFMksrJvVz2DYgYWCENBU2x42C", "Trần Tuấn Anh (VIP)", "user", true),
            new UserData("giathinh", "giathinh.student@hcmut.edu.vn", "$2a$10$.J7MALTe9SrRBVXXO35rKuGJy2jNFMksrJvVz2DYgYWCENBU2x42C", "Huỳnh Gia Thịnh (Sinh viên IT)", "user", true),
            new UserData("hoangminh", "hoangminh.tech@gmail.com", "$2a$10$.J7MALTe9SrRBVXXO35rKuGJy2jNFMksrJvVz2DYgYWCENBU2x42C", "Hoàng Minh (Tech Reviewer / Gamer)", "user", true),
            new UserData("lananh", "lananh.office@company.vn", "$2a$10$.J7MALTe9SrRBVXXO35rKuGJy2jNFMksrJvVz2DYgYWCENBU2x42C", "Nguyễn Lan Anh (Văn phòng)", "user", true),
            new UserData("khanh_reviewer", "khanh.reviewer@techlab.vn", "$2a$10$.J7MALTe9SrRBVXXO35rKuGJy2jNFMksrJvVz2DYgYWCENBU2x42C", "Trần Quốc Khánh (Chuyên gia Đánh giá)", "user", true),
            new UserData("spammer_bot", "spambot999@disposable.org", "$2a$10$.J7MALTe9SrRBVXXO35rKuGJy2jNFMksrJvVz2DYgYWCENBU2x42C", "Dịch vụ Quảng cáo 247 (Spam Bot)", "user", false)
        );

        List<User> result = new java.util.ArrayList<>();
        result.add(resolveDefaultCrawlerUser());

        for (UserData ud : defaultUsers) {
            List<User> existing = entityManager.createQuery("SELECT u FROM User u WHERE u.username = :username", User.class)
                    .setParameter("username", ud.username())
                    .getResultList();
            if (existing.isEmpty()) {
                User user = User.builder()
                        .username(ud.username())
                        .email(ud.email())
                        .passwordHash(ud.passwordHash())
                        .displayName(ud.displayName())
                        .role(ud.role())
                        .isActive(ud.isActive())
                        .build();
                entityManager.persist(user);
                result.add(user);
            } else {
                User user = existing.get(0);
                user.setEmail(ud.email());
                user.setDisplayName(ud.displayName());
                user.setRole(ud.role());
                user.setIsActive(ud.isActive());
                entityManager.merge(user);
                result.add(user);
            }
        }
        log.info("Seeded/updated {} test users", result.size());
        return result;
    }

    public List<User> getAllUsers() {
        return entityManager.createQuery("SELECT u FROM User u ORDER BY u.id ASC", User.class)
                .getResultList();
    }
}

package com.shoppingagent.seed;

import com.shoppingagent.shared.entity.Product;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/seed")
@RequiredArgsConstructor
public class SeedController {

    private final SeedService seedService;

    @PostMapping(value = "/products", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> seedProduct(
            @RequestPart("productData") String productDataJson,
            @RequestPart(value = "images", required = false) MultipartFile[] images) {
        
        try {
            Product savedProduct = seedService.seedProduct(productDataJson, images);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "productId", savedProduct.getId(),
                    "message", "Product seeded successfully"
            ));
        } catch (IOException e) {
            log.error("Failed to seed product", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "error",
                    "message", "Failed to upload images or process product data: " + e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Unexpected error during seeding", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        }
    }
    @GetMapping("/products")
    public ResponseEntity<?> getAllProducts() {
        return ResponseEntity.ok(seedService.getAllProducts());
    }

    @PostMapping("/products/{id}/reviews")
    public ResponseEntity<?> seedReviews(
            @PathVariable Long id,
            @RequestBody java.util.List<com.shoppingagent.seed.dto.ReviewSeedRequest> reviews) {
        try {
            seedService.seedReviewsForProduct(id, reviews);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Seeded " + reviews.size() + " reviews successfully"
            ));
        } catch (Exception e) {
            log.error("Failed to seed reviews for product {}", id, e);
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        }
    }

    @PostMapping("/users")
    public ResponseEntity<?> seedUsers() {
        try {
            var users = seedService.seedDefaultUsers();
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "count", users.size(),
                    "users", users.stream().map(u -> Map.of(
                            "id", u.getId(),
                            "username", u.getUsername(),
                            "email", u.getEmail(),
                            "displayName", u.getDisplayName(),
                            "role", u.getRole(),
                            "isActive", u.getIsActive()
                    )).toList()
            ));
        } catch (Exception e) {
            log.error("Failed to seed default users", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        var users = seedService.getAllUsers();
        return ResponseEntity.ok(users.stream().map(u -> Map.of(
                "id", u.getId(),
                "username", u.getUsername(),
                "email", u.getEmail(),
                "displayName", u.getDisplayName(),
                "role", u.getRole(),
                "isActive", u.getIsActive()
        )).toList());
    }
}

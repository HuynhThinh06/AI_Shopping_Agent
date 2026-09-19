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
}

package com.shoppingagent.product;

import com.shoppingagent.product.dto.ProductDetailDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller quản lý thông tin sản phẩm.
 *
 * Endpoints:
 *   GET  /products          — Danh sách có filter + phân trang
 *   GET  /products/{id}     — Chi tiết sản phẩm theo ID
 *   POST /products          — Tạo sản phẩm mới (có upload ảnh)
 */
@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Quản lý thông tin sản phẩm")
public class ProductController {

    private final ProductService productService;

    // ── [MỚI - B7] GET /products ─────────────────────────────────────────────

    @GetMapping
    @Operation(
        summary     = "Danh sách sản phẩm (filter + phân trang)",
        description = "Tất cả tham số đều tùy chọn. Sắp xếp mặc định: avg_rating giảm dần.\n\n" +
                      "Ví dụ sử dụng:\n" +
                      "- Tất cả laptop:  GET /api/products?categoryCode=laptop\n" +
                      "- Theo giá:       GET /api/products?minPrice=10000000&maxPrice=20000000\n" +
                      "- Theo từ khoá:   GET /api/products?keyword=Dell\n" +
                      "- Kết hợp:        GET /api/products?categoryCode=laptop&maxPrice=20000000&keyword=Dell&page=0&size=20"
    )
    public ResponseEntity<Page<ProductDetailDTO>> searchProducts(
            @Parameter(description = "Mã ngành hàng: `laptop` hoặc `phone`")
            @RequestParam(required = false) String categoryCode,
            @Parameter(description = "Giá tối thiểu (VNĐ), ví dụ: 10000000")
            @RequestParam(required = false) Long   minPrice,
            @Parameter(description = "Giá tối đa (VNĐ), ví dụ: 25000000")
            @RequestParam(required = false) Long   maxPrice,
            @Parameter(description = "Từ khoá tìm trong tên sản phẩm hoặc thương hiệu")
            @RequestParam(required = false) String keyword,
            @Parameter(description = "Số trang, bắt đầu từ 0")
            @RequestParam(defaultValue = "0")  int page,
            @Parameter(description = "Số sản phẩm mỗi trang, tối đa 50")
            @RequestParam(defaultValue = "20") int size) {

        int safeSize = Math.min(size, 50);  // giới hạn tối đa 50
        return ResponseEntity.ok(
                productService.searchProducts(categoryCode, minPrice, maxPrice, keyword, page, safeSize));
    }

    // ── GET /products/{id} ───────────────────────────────────────────────────

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết sản phẩm theo ID")
    public ResponseEntity<ProductDetailDTO> getProduct(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getById(id));
    }

    // ── POST /products ───────────────────────────────────────────────────────

    @PostMapping(consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
        summary     = "Tạo sản phẩm mới (có kèm upload ảnh)",
        description = "Upload ảnh lên Cloudinary, lưu URL vào bảng product_images.\n" +
                      "Ảnh đầu tiên được đánh dấu is_primary = true."
    )
    public ResponseEntity<ProductDetailDTO> createProduct(
            @RequestPart("product") com.shoppingagent.product.dto.ProductCreateRequest request,
            @RequestPart(value = "images", required = false)
            java.util.List<org.springframework.web.multipart.MultipartFile> images) {
        return ResponseEntity.ok(productService.createProduct(request, images));
    }
}

package com.shoppingagent.review;

import com.shoppingagent.review.dto.ReviewCreateRequest;
import com.shoppingagent.review.dto.ReviewResponseDTO;
import com.shoppingagent.review.dto.SummaryDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller quản lý Review và tóm tắt AI cho sản phẩm.
 *
 * Base path: /products/{productId}
 *
 * Endpoints:
 *   GET  /products/{productId}/reviews         — Danh sách review phân trang
 *   POST /products/{productId}/reviews         — Thêm review mới
 *   GET  /products/{productId}/summary         — Tóm tắt AI (có cache)
 */
@RestController
@RequestMapping("/products/{productId}")
@RequiredArgsConstructor
@Tag(name = "Reviews", description = "Đánh giá sản phẩm và tóm tắt AI")
public class ReviewController {

    private final ReviewService     reviewService;
    private final SummarizerService summarizerService;

    // ── [MỚI] GET /products/{productId}/reviews ──────────────────────────────

    @GetMapping("/reviews")
    @Operation(
        summary     = "Danh sách review của sản phẩm (phân trang)",
        description = "Trả về các review đang active, sắp xếp theo ngày mới nhất.\n" +
                      "Query params: `page` (bắt đầu từ 0, mặc định 0), `size` (mặc định 10).\n" +
                      "Ví dụ: GET /api/products/5/reviews?page=1&size=20"
    )
    public ResponseEntity<Page<ReviewResponseDTO>> listReviews(
            @PathVariable Long productId,
            @Parameter(description = "Số trang, bắt đầu từ 0")
            @RequestParam(defaultValue = "0")  int page,
            @Parameter(description = "Số review mỗi trang, tối đa 50")
            @RequestParam(defaultValue = "10") int size) {

        // Giới hạn size tối đa 50 để tránh query nặng
        int safeSize = Math.min(size, 50);
        Pageable pageable = PageRequest.of(
                page,
                safeSize,
                Sort.by("createdAt").descending()   // review mới nhất lên đầu
        );
        return ResponseEntity.ok(reviewService.listReviews(productId, pageable));
    }

    // ── [MỚI] POST /products/{productId}/reviews ─────────────────────────────

    @PostMapping("/reviews")
    @Operation(
        summary     = "Thêm review mới cho sản phẩm",
        description = "Sau khi thêm thành công:\n" +
                      "- `avg_rating` và `review_count` của sản phẩm được tự động cập nhật.\n" +
                      "- Lần gọi GET /summary tiếp theo sẽ phát hiện review_count đã tăng " +
                      "và tự gọi LLM Gemini để làm mới bản tóm tắt.\n\n" +
                      "Body JSON ví dụ:\n" +
                      "```json\n" +
                      "{\n" +
                      "  \"reviewerName\": \"Nguyễn Văn A\",\n" +
                      "  \"content\": \"Pin dùng được cả ngày, màn hình đẹp\",\n" +
                      "  \"rating\": 5\n" +
                      "}\n" +
                      "```"
    )
    public ResponseEntity<ReviewResponseDTO> createReview(
            @PathVariable Long productId,
            @Valid @RequestBody ReviewCreateRequest request) {

        // @Valid kích hoạt tự động validate @NotBlank, @Size, @Min/@Max trong DTO
        return ResponseEntity.ok(reviewService.createReview(productId, request));
    }

    // ── [CŨ — GIỮ NGUYÊN] GET /products/{productId}/summary ─────────────────

    @GetMapping("/summary")
    @Operation(
        summary     = "Lấy tóm tắt AI ưu/nhược điểm sản phẩm (có cache)",
        description = "Logic cache:\n" +
                      "- Nếu `review_count` chưa thay đổi → trả kết quả cache ngay (~5ms, không tốn API token).\n" +
                      "- Nếu có review mới (`review_count` tăng) → gọi Gemini API tóm tắt lại, lưu cache.\n\n" +
                      "Response có field `cached: true/false` để biết kết quả lấy từ cache hay LLM mới."
    )
    public ResponseEntity<SummaryDTO> getSummary(@PathVariable Long productId) {
        return ResponseEntity.ok(summarizerService.getSummary(productId));
    }
}

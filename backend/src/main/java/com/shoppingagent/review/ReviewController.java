package com.shoppingagent.review;

import com.shoppingagent.review.dto.SummaryDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/products/{productId}/summary")
@RequiredArgsConstructor
@Tag(name = "Reviews", description = "Tóm tắt đánh giá sản phẩm bằng AI")
public class ReviewController {

    private final SummarizerService summarizerService;

    @GetMapping
    @Operation(
        summary = "Lấy tóm tắt review AI",
        description = "Tổng hợp ưu/nhược điểm sản phẩm từ reviews người dùng. Kết quả được cache, chỉ gọi LLM khi có review mới."
    )
    public ResponseEntity<SummaryDTO> getSummary(@PathVariable Long productId) {
        return ResponseEntity.ok(summarizerService.getSummary(productId));
    }
}

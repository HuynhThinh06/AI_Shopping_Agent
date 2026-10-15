package com.shoppingagent.admin;

import com.shoppingagent.admin.dto.*;
import com.shoppingagent.review.dto.ReviewResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Tag(name = "Admin & Benchmark", description = "Quản trị hệ thống, giám sát LLM, trọng số và đo đạc thực nghiệm GIN Index")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    @Operation(summary = "Lấy thống kê hệ thống, KPI độ trễ và chi phí token LLM")
    public ResponseEntity<SystemStatsDTO> getSystemStats() {
        return ResponseEntity.ok(adminService.getSystemStats());
    }

    @GetMapping("/llm-logs")
    @Operation(summary = "Danh sách log gọi LLM phân trang (prompt, response, latency, token)")
    public ResponseEntity<Page<LlmLogResponseDTO>> getLlmLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        int safeSize = Math.min(size, 100);
        return ResponseEntity.ok(adminService.getLlmLogs(PageRequest.of(page, safeSize)));
    }

    @GetMapping("/reviews")
    @Operation(summary = "Danh sách tất cả đánh giá sản phẩm (dành cho quản trị/kiểm duyệt)")
    public ResponseEntity<Page<ReviewResponseDTO>> getAllReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        int safeSize = Math.min(size, 100);
        return ResponseEntity.ok(adminService.getAllReviews(PageRequest.of(page, safeSize, Sort.by("createdAt").descending())));
    }

    @GetMapping("/weights/{categoryCode}")
    @Operation(summary = "Lấy bộ trọng số xếp hạng theo ngành hàng (price, rating, spec_match)")
    public ResponseEntity<Map<String, Double>> getCategoryWeights(@PathVariable String categoryCode) {
        return ResponseEntity.ok(adminService.getCategoryWeights(categoryCode));
    }

    @PutMapping("/weights/{categoryCode}")
    @Operation(summary = "Cập nhật trọng số xếp hạng theo ngành hàng")
    public ResponseEntity<Map<String, Double>> updateCategoryWeights(
            @PathVariable String categoryCode,
            @RequestBody UpdateWeightsRequest req) {
        return ResponseEntity.ok(adminService.updateCategoryWeights(categoryCode, req.getWeights()));
    }

    @PostMapping("/benchmark")
    @Operation(summary = "Chạy đo đạc thực nghiệm so sánh tốc độ truy vấn CSDL trước và sau khi có GIN Index")
    public ResponseEntity<GinBenchmarkResultDTO> runBenchmark(@RequestBody(required = false) GinBenchmarkRequest req) {
        if (req == null) {
            req = GinBenchmarkRequest.builder().build();
        }
        return ResponseEntity.ok(adminService.runGinBenchmark(req));
    }
}

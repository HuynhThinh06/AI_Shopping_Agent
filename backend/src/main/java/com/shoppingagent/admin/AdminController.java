package com.shoppingagent.admin;

import com.shoppingagent.admin.dto.*;
import com.shoppingagent.review.dto.ReviewResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Các API dành cho phân hệ Quản trị viên (P1)")
@Tag(name = "Admin & Benchmark", description = "Quản trị hệ thống, giám sát LLM, trọng số và đo đạc thực nghiệm GIN Index")
public class AdminController {

    private final AdminService adminService;

    @Operation(summary = "Lấy số liệu thống kê tổng quan (Dashboard KPIs)")
    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDTO> getStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    @Operation(summary = "Lấy danh sách đánh giá phục vụ kiểm duyệt")
    @GetMapping("/reviews")
    public ResponseEntity<Page<AdminReviewDTO>> getReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "all") String filter
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(adminService.getReviews(pageable, filter));
    }

    @Operation(summary = "Đổi cờ Spam cho một đánh giá")
    @PutMapping("/reviews/{id}/toggle-spam")
    public ResponseEntity<AdminReviewDTO> toggleSpam(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.toggleReviewSpam(id));
    }

    @Operation(summary = "Phê duyệt đánh giá hợp lệ")
    @PutMapping("/reviews/{id}/approve")
    public ResponseEntity<AdminReviewDTO> approveReview(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.approveReview(id));
    }

    @Operation(summary = "Xóa mềm đánh giá")
    @DeleteMapping("/reviews/{id}")
    public ResponseEntity<Void> deleteReview(@PathVariable Long id) {
        adminService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Kích hoạt AI tóm tắt lại review cho sản phẩm")
    @PostMapping("/reviews/{productId}/summarize")
    public ResponseEntity<Map<String, String>> triggerSummarize(@PathVariable Long productId) {
        adminService.triggerReSummarize(productId);
        return ResponseEntity.ok(Map.of("message", "Đã kích hoạt tóm tắt AI cho sản phẩm ID: " + productId));
    }

    @Operation(summary = "Lấy cấu hình trọng số Ranking của các ngành hàng")
    @GetMapping("/weights")
    public ResponseEntity<Map<String, Map<String, Double>>> getWeights() {
        return ResponseEntity.ok(adminService.getAllRankingWeights());
    }

    @Operation(summary = "Cập nhật trọng số Ranking cho ngành hàng")
    @PutMapping("/weights")
    public ResponseEntity<Map<String, Double>> updateWeights(@RequestBody RankingWeightDTO dto) {
        return ResponseEntity.ok(adminService.updateRankingWeights(dto));
    }

    @Operation(summary = "Lấy danh sách nhật ký gọi mô hình LLM")
    @GetMapping("/llm-logs")
    public ResponseEntity<Page<LlmLogDTO>> getLlmLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String requestType,
            @RequestParam(required = false) String status
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(adminService.getLlmLogs(pageable, requestType, status));
    }

    @Operation(summary = "Lấy số liệu đo đạc thực nghiệm Benchmark")
    @GetMapping("/benchmark")
    public ResponseEntity<BenchmarkStatsDTO> getBenchmark() {
        return ResponseEntity.ok(adminService.getBenchmarkStats());
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

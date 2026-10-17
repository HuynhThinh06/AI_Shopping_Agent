package com.shoppingagent.admin;

import com.shoppingagent.admin.dto.*;
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
@Tag(name = "Admin & Benchmark", description = "Quản trị hệ thống, kiểm duyệt đánh giá, giám sát LLM, trọng số và đo đạc thực nghiệm GIN Index")
public class AdminController {

    private final AdminService adminService;

    // ── 1. Thống kê hệ thống & Dashboard ────────────────────────────────────

    @GetMapping("/stats")
    @Operation(summary = "Lấy thống kê hệ thống, KPI độ trễ và chi phí token LLM")
    public ResponseEntity<SystemStatsDTO> getSystemStats() {
        return ResponseEntity.ok(adminService.getSystemStats());
    }

    @GetMapping("/dashboard-stats")
    @Operation(summary = "Lấy số liệu thống kê tổng quan (Dashboard KPIs)")
    public ResponseEntity<AdminStatsDTO> getDashboardStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    // ── 2. Quản lý và kiểm duyệt Review ─────────────────────────────────────

    @GetMapping("/reviews")
    @Operation(summary = "Lấy danh sách đánh giá phục vụ kiểm duyệt")
    public ResponseEntity<Page<AdminReviewDTO>> getReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "all", required = false) String filter
    ) {
        int safeSize = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, safeSize, Sort.by("createdAt").descending());
        return ResponseEntity.ok(adminService.getReviews(pageable, filter));
    }

    @PutMapping("/reviews/{id}/toggle-spam")
    @Operation(summary = "Đổi cờ Spam cho một đánh giá")
    public ResponseEntity<AdminReviewDTO> toggleSpam(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.toggleReviewSpam(id));
    }

    @PutMapping("/reviews/{id}/approve")
    @Operation(summary = "Phê duyệt đánh giá hợp lệ")
    public ResponseEntity<AdminReviewDTO> approveReview(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.approveReview(id));
    }

    @DeleteMapping("/reviews/{id}")
    @Operation(summary = "Xóa mềm đánh giá")
    public ResponseEntity<Void> deleteReview(@PathVariable Long id) {
        adminService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reviews/{productId}/summarize")
    @Operation(summary = "Kích hoạt AI tóm tắt lại review cho sản phẩm")
    public ResponseEntity<Map<String, String>> triggerSummarize(@PathVariable Long productId) {
        adminService.triggerReSummarize(productId);
        return ResponseEntity.ok(Map.of("message", "Đã kích hoạt tóm tắt AI cho sản phẩm ID: " + productId));
    }

    // ── 3. Quản lý cấu hình trọng số Ranking ──────────────────────────────

    @GetMapping("/weights")
    @Operation(summary = "Lấy cấu hình trọng số Ranking của tất cả ngành hàng")
    public ResponseEntity<Map<String, Map<String, Double>>> getWeights() {
        return ResponseEntity.ok(adminService.getAllRankingWeights());
    }

    @PutMapping("/weights")
    @Operation(summary = "Cập nhật trọng số Ranking cho ngành hàng (theo DTO)")
    public ResponseEntity<Map<String, Double>> updateWeights(@RequestBody RankingWeightDTO dto) {
        return ResponseEntity.ok(adminService.updateRankingWeights(dto));
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

    // ── 4. Nhật ký gọi LLM ──────────────────────────────────────────────────

    @GetMapping("/llm-logs")
    @Operation(summary = "Danh sách log gọi LLM phân trang (prompt, response, latency, token)")
    public ResponseEntity<Page<LlmLogResponseDTO>> getLlmLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(required = false) String requestType,
            @RequestParam(required = false) String status) {
        int safeSize = Math.min(size, 100);
        return ResponseEntity.ok(adminService.getLlmLogs(PageRequest.of(page, safeSize), requestType, status));
    }

    // ── 5. Benchmark thực nghiệm & GIN Index ─────────────────────────────────

    @GetMapping("/benchmark")
    @Operation(summary = "Lấy số liệu đo đạc thực nghiệm Benchmark tổng thể")
    public ResponseEntity<BenchmarkStatsDTO> getBenchmark() {
        return ResponseEntity.ok(adminService.getBenchmarkStats());
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

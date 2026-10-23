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
    private final ProductExcelService productExcelService;

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
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by("createdAt").descending());
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
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 50);
        return ResponseEntity.ok(adminService.getLlmLogs(PageRequest.of(safePage, safeSize), requestType, status));
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

    // ── 6. Quản trị Người dùng ──────────────────────────────────────────────

    @GetMapping("/users")
    @Operation(summary = "Danh sách người dùng phân trang và tìm kiếm")
    public ResponseEntity<Page<AdminUserDTO>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        return ResponseEntity.ok(adminService.getUsers(PageRequest.of(safePage, safeSize, Sort.by("id").ascending()), keyword, role));
    }

    @PutMapping("/users/{id}/role")
    @Operation(summary = "Cập nhật vai trò người dùng (admin / user)")
    public ResponseEntity<AdminUserDTO> updateUserRole(
            @PathVariable Integer id,
            @RequestBody UpdateUserRoleRequest request) {
        return ResponseEntity.ok(adminService.updateUserRole(id, request.getRole()));
    }

    @PutMapping("/users/{id}/toggle-status")
    @Operation(summary = "Khóa hoặc mở khóa tài khoản người dùng")
    public ResponseEntity<AdminUserDTO> toggleUserStatus(@PathVariable Integer id) {
        return ResponseEntity.ok(adminService.toggleUserStatus(id));
    }

    @DeleteMapping("/users/{id}")
    @Operation(summary = "Vô hiệu hóa người dùng")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    // ── 7. Nhập / Xuất Excel Sản phẩm ───────────────────────────────────────

    @GetMapping("/products/export")
    @Operation(summary = "Xuất danh sách sản phẩm ra file Excel (.xlsx)")
    public ResponseEntity<byte[]> exportProducts(
            @RequestParam(required = false) String categoryCode,
            @RequestParam(required = false) String keyword) throws java.io.IOException {
        byte[] excelBytes = productExcelService.exportProductsToExcel(categoryCode, keyword);
        String timestamp = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = "products_export_" + timestamp + ".xlsx";

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .body(excelBytes);
    }

    @GetMapping("/products/template")
    @Operation(summary = "Tải file mẫu Excel (.xlsx) để nhập sản phẩm")
    public ResponseEntity<byte[]> downloadTemplate() throws java.io.IOException {
        byte[] templateBytes = productExcelService.generateExcelTemplate();
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"product_import_template.xlsx\"")
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .body(templateBytes);
    }

    @PostMapping(value = "/products/import", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Nhập danh sách sản phẩm hàng loạt từ file Excel (.xlsx / .xls)")
    public ResponseEntity<com.shoppingagent.admin.dto.ProductExcelImportResultDTO> importProducts(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        return ResponseEntity.ok(productExcelService.importProductsFromExcel(file));
    }
}

package com.shoppingagent.admin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shoppingagent.admin.dto.ProductExcelImportResultDTO;
import com.shoppingagent.product.CategoryRepository;
import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.shared.entity.Category;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.ProductImage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductExcelService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ObjectMapper objectMapper;
    private final CacheManager cacheManager;

    private static final String[] HEADERS = {
            "ID",
            "SKU (*)",
            "Tên sản phẩm (*)",
            "Mã ngành hàng (*)",
            "Tên ngành hàng",
            "Thương hiệu",
            "Giá bán (VNĐ) (*)",
            "Tồn kho",
            "Trạng thái (1=Hiện, 0=Ẩn)",
            "Đánh giá trung bình",
            "Số lượt đánh giá",
            "Thông số kỹ thuật (JSON/Text)",
            "Danh sách URL ảnh (,)",
            "Đường dẫn sản phẩm gốc"
    };

    /**
     * Xuất danh sách sản phẩm ra file Excel (.xlsx) kèm định dạng chuẩn chuyên nghiệp
     */
    @Transactional(readOnly = true)
    public byte[] exportProductsToExcel(String categoryCode, String keyword) throws IOException {
        String cleanCategory = (categoryCode != null && !categoryCode.isBlank()) ? categoryCode.trim() : "";
        String cleanKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : "";

        List<Product> products = productRepository.findForExport(cleanCategory, cleanKeyword);
        log.info("[ProductExcel] Exporting {} products (category='{}', keyword='{}')",
                products.size(), cleanCategory, cleanKeyword);

        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Danh sách sản phẩm");
            sheet.setDisplayGridlines(true);

            // Styles
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createBorderedStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);
            CellStyle centerStyle = createCenterStyle(workbook);
            CellStyle decimalStyle = createDecimalStyle(workbook);

            // Create Header Row
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(28);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            // Fill Data Rows
            int rowIdx = 1;
            for (Product p : products) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(22);

                // 0: ID
                Cell c0 = row.createCell(0);
                if (p.getId() != null) c0.setCellValue(p.getId());
                c0.setCellStyle(centerStyle);

                // 1: SKU
                Cell c1 = row.createCell(1);
                c1.setCellValue(p.getSku() != null ? p.getSku() : "");
                c1.setCellStyle(dataStyle);

                // 2: Name
                Cell c2 = row.createCell(2);
                c2.setCellValue(p.getName() != null ? p.getName() : "");
                c2.setCellStyle(dataStyle);

                // 3: Category Code
                Cell c3 = row.createCell(3);
                String catCode = p.getCategory() != null ? p.getCategory().getCode() : "";
                c3.setCellValue(catCode);
                c3.setCellStyle(centerStyle);

                // 4: Category Name
                Cell c4 = row.createCell(4);
                String catName = p.getCategory() != null ? p.getCategory().getName() : "";
                c4.setCellValue(catName);
                c4.setCellStyle(dataStyle);

                // 5: Brand
                Cell c5 = row.createCell(5);
                c5.setCellValue(p.getBrand() != null ? p.getBrand() : "");
                c5.setCellStyle(dataStyle);

                // 6: Price
                Cell c6 = row.createCell(6);
                if (p.getPrice() != null) c6.setCellValue(p.getPrice());
                c6.setCellStyle(currencyStyle);

                // 7: Stock
                Cell c7 = row.createCell(7);
                c7.setCellValue(p.getStockQuantity() != null ? p.getStockQuantity() : 0);
                c7.setCellStyle(centerStyle);

                // 8: Status
                Cell c8 = row.createCell(8);
                c8.setCellValue(Boolean.TRUE.equals(p.getIsActive()) ? 1 : 0);
                c8.setCellStyle(centerStyle);

                // 9: Avg Rating
                Cell c9 = row.createCell(9);
                if (p.getAvgRating() != null) c9.setCellValue(p.getAvgRating().doubleValue());
                c9.setCellStyle(decimalStyle);

                // 10: Review Count
                Cell c10 = row.createCell(10);
                c10.setCellValue(p.getReviewCount() != null ? p.getReviewCount() : 0);
                c10.setCellStyle(centerStyle);

                // 11: Specs
                Cell c11 = row.createCell(11);
                String specsJson = "";
                if (p.getSpecs() != null && !p.getSpecs().isEmpty()) {
                    try {
                        specsJson = objectMapper.writeValueAsString(p.getSpecs());
                    } catch (Exception ignored) {
                        specsJson = p.getSpecs().toString();
                    }
                }
                c11.setCellValue(specsJson);
                c11.setCellStyle(dataStyle);

                // 12: Image URLs
                Cell c12 = row.createCell(12);
                String imagesStr = "";
                if (p.getImages() != null && !p.getImages().isEmpty()) {
                    imagesStr = p.getImages().stream()
                            .map(ProductImage::getImageUrl)
                            .filter(Objects::nonNull)
                            .collect(Collectors.joining(", "));
                }
                c12.setCellValue(imagesStr);
                c12.setCellStyle(dataStyle);

                // 13: Product URL
                Cell c13 = row.createCell(13);
                c13.setCellValue(p.getProductUrl() != null ? p.getProductUrl() : "");
                c13.setCellStyle(dataStyle);
            }

            // Auto-filter
            if (rowIdx > 1) {
                sheet.setAutoFilter(new CellRangeAddress(0, rowIdx - 1, 0, HEADERS.length - 1));
            }

            // Auto-size columns with bounds
            for (int i = 0; i < HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
                int currentWidth = sheet.getColumnWidth(i);
                sheet.setColumnWidth(i, Math.min(Math.max(currentWidth + 1200, 3200), 22000));
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Tạo file mẫu Excel (.xlsx) với tiêu đề chuẩn và 2 dòng dữ liệu mẫu
     */
    public byte[] generateExcelTemplate() throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Nhập sản phẩm mẫu");
            sheet.setDisplayGridlines(true);

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createBorderedStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);
            CellStyle centerStyle = createCenterStyle(workbook);
            CellStyle decimalStyle = createDecimalStyle(workbook);

            // Header
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(28);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            // Dòng mẫu 1: Laptop
            Row r1 = sheet.createRow(1);
            r1.setHeightInPoints(22);
            r1.createCell(0).setCellValue("");
            r1.getCell(0).setCellStyle(centerStyle);
            r1.createCell(1).setCellValue("LAP-ASUS-VIVO15");
            r1.getCell(1).setCellStyle(dataStyle);
            r1.createCell(2).setCellValue("Laptop Asus Vivobook 15 OLED A1505ZA");
            r1.getCell(2).setCellStyle(dataStyle);
            r1.createCell(3).setCellValue("laptop");
            r1.getCell(3).setCellStyle(centerStyle);
            r1.createCell(4).setCellValue("Laptop");
            r1.getCell(4).setCellStyle(dataStyle);
            r1.createCell(5).setCellValue("Asus");
            r1.getCell(5).setCellStyle(dataStyle);
            r1.createCell(6).setCellValue(16990000);
            r1.getCell(6).setCellStyle(currencyStyle);
            r1.createCell(7).setCellValue(20);
            r1.getCell(7).setCellStyle(centerStyle);
            r1.createCell(8).setCellValue(1);
            r1.getCell(8).setCellStyle(centerStyle);
            r1.createCell(9).setCellValue(4.8);
            r1.getCell(9).setCellStyle(decimalStyle);
            r1.createCell(10).setCellValue(18);
            r1.getCell(10).setCellStyle(centerStyle);
            r1.createCell(11).setCellValue("{\"ram\": 16, \"storage\": 512, \"cpu\": \"Core i5-1235U\", \"screen_size\": 15.6}");
            r1.getCell(11).setCellStyle(dataStyle);
            r1.createCell(12).setCellValue("https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800");
            r1.getCell(12).setCellStyle(dataStyle);
            r1.createCell(13).setCellValue("https://example.com/products/asus-vivobook-15");
            r1.getCell(13).setCellStyle(dataStyle);

            // Dòng mẫu 2: Phone
            Row r2 = sheet.createRow(2);
            r2.setHeightInPoints(22);
            r2.createCell(0).setCellValue("");
            r2.getCell(0).setCellStyle(centerStyle);
            r2.createCell(1).setCellValue("PHO-IPHONE-15PM");
            r2.createCell(2).setCellValue("iPhone 15 Pro Max 256GB");
            r2.createCell(3).setCellValue("phone");
            r2.createCell(4).setCellValue("Điện thoại");
            r2.createCell(5).setCellValue("Apple");
            r2.createCell(6).setCellValue(29490000);
            r2.createCell(7).setCellValue(15);
            r2.createCell(8).setCellValue(1);
            r2.createCell(9).setCellValue(4.9);
            r2.createCell(10).setCellValue(42);
            r2.createCell(11).setCellValue("{\"storage\": 256, \"battery\": 4422, \"screen_size\": 6.7}");
            r2.createCell(12).setCellValue("https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800");
            r2.createCell(13).setCellValue("https://example.com/products/iphone-15-pro-max");

            for (int i = 0; i < HEADERS.length; i++) {
                if (i == 0 || i == 3 || i == 7 || i == 8 || i == 10) r2.getCell(i).setCellStyle(centerStyle);
                else if (i == 6) r2.getCell(i).setCellStyle(currencyStyle);
                else if (i == 9) r2.getCell(i).setCellStyle(decimalStyle);
                else r2.getCell(i).setCellStyle(dataStyle);
            }

            for (int i = 0; i < HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
                int currentWidth = sheet.getColumnWidth(i);
                sheet.setColumnWidth(i, Math.min(Math.max(currentWidth + 1200, 3200), 22000));
            }

            // Sheet hướng dẫn
            Sheet guideSheet = workbook.createSheet("Quy định nhập dữ liệu");
            guideSheet.setDisplayGridlines(true);
            Row gRow0 = guideSheet.createRow(0);
            gRow0.createCell(0).setCellValue("CỘT");
            gRow0.createCell(1).setCellValue("BẮT BUỘC");
            gRow0.createCell(2).setCellValue("QUY CÁCH DỮ LIỆU & Ý NGHĨA");
            gRow0.getCell(0).setCellStyle(headerStyle);
            gRow0.getCell(1).setCellStyle(headerStyle);
            gRow0.getCell(2).setCellStyle(headerStyle);

            String[][] guidelines = {
                    {"ID", "Không", "Để trống nếu thêm mới. Nếu điền ID cũ, hệ thống sẽ kiểm tra cập nhật."},
                    {"SKU (*)", "Có", "Mã sản phẩm định danh duy nhất (ví dụ: LAP-ASUS-01). Dùng để Upsert (nếu đã có trên DB thì cập nhật, chưa có thì thêm mới)."},
                    {"Tên sản phẩm (*)", "Có", "Tên đầy đủ của sản phẩm, không được để trống."},
                    {"Mã ngành hàng (*)", "Có", "Mã ngành hàng viết thường: 'laptop', 'phone'... phải tồn tại trong danh mục hệ thống."},
                    {"Giá bán (VNĐ) (*)", "Có", "Giá bán tính bằng VNĐ dạng số dương (ví dụ: 15000000, không điền dấu chấm phẩy tiền tệ)."},
                    {"Tồn kho", "Không", "Số nguyên không âm (mặc định 10 nếu để trống)."},
                    {"Trạng thái", "Không", "Điền 1 nếu đang bán, 0 nếu đã ẩn khỏi catalog (mặc định 1)."},
                    {"Thông số kỹ thuật", "Không", "Định dạng JSON (ví dụ: {\"ram\": 16, \"cpu\": \"i7\"}) hoặc cặp key: value."},
                    {"Danh sách URL ảnh", "Không", "Các đường link ảnh cách nhau bằng dấu phẩy (,)."}
            };

            for (int i = 0; i < guidelines.length; i++) {
                Row row = guideSheet.createRow(i + 1);
                row.createCell(0).setCellValue(guidelines[i][0]);
                row.createCell(1).setCellValue(guidelines[i][1]);
                row.createCell(2).setCellValue(guidelines[i][2]);
                row.getCell(0).setCellStyle(dataStyle);
                row.getCell(1).setCellStyle(centerStyle);
                row.getCell(2).setCellStyle(dataStyle);
            }
            guideSheet.autoSizeColumn(0);
            guideSheet.autoSizeColumn(1);
            guideSheet.autoSizeColumn(2);

            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Nhập danh sách sản phẩm từ file Excel (.xlsx / .xls) với cơ chế Upsert và Validate chi tiết
     */
    @Transactional
    public ProductExcelImportResultDTO importProductsFromExcel(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn file Excel để tải lên.");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.toLowerCase().endsWith(".xlsx") && !filename.toLowerCase().endsWith(".xls"))) {
            throw new IllegalArgumentException("Định dạng file không hợp lệ! Vui lòng chỉ tải lên file Excel (.xlsx hoặc .xls).");
        }

        ProductExcelImportResultDTO result = ProductExcelImportResultDTO.builder().build();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            int lastRowNum = sheet.getLastRowNum();
            log.info("[ProductExcel] Importing from file '{}', rows found: {}", filename, lastRowNum);

            for (int r = 1; r <= lastRowNum; r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                result.setTotalRows(result.getTotalRows() + 1);
                int humanRowNum = r + 1; // Số dòng trên giao diện Excel (dòng 1 là tiêu đề)

                try {
                    String sku = getCellStringValue(row.getCell(1));
                    String name = getCellStringValue(row.getCell(2));
                    String categoryCode = getCellStringValue(row.getCell(3));
                    String brand = getCellStringValue(row.getCell(5));
                    Long price = getCellLongValue(row.getCell(6));
                    Integer stock = getCellIntValue(row.getCell(7));
                    Integer statusVal = getCellIntValue(row.getCell(8));
                    BigDecimal avgRating = getCellBigDecimalValue(row.getCell(9));
                    Integer reviewCount = getCellIntValue(row.getCell(10));
                    String specsRaw = getCellStringValue(row.getCell(11));
                    String imagesRaw = getCellStringValue(row.getCell(12));
                    String productUrl = getCellStringValue(row.getCell(13));

                    // ── 1. Validate các trường bắt buộc ────────────────────────
                    if (name.isBlank()) {
                        result.getErrors().add("Dòng " + humanRowNum + ": Tên sản phẩm không được để trống.");
                        result.setErrorCount(result.getErrorCount() + 1);
                        continue;
                    }

                    if (categoryCode.isBlank()) {
                        result.getErrors().add("Dòng " + humanRowNum + ": Mã ngành hàng không được để trống.");
                        result.setErrorCount(result.getErrorCount() + 1);
                        continue;
                    }

                    Category category = categoryRepository.findByCode(categoryCode.toLowerCase().trim()).orElse(null);
                    if (category == null) {
                        result.getErrors().add("Dòng " + humanRowNum + ": Ngành hàng '" + categoryCode + "' không tồn tại trong hệ thống.");
                        result.setErrorCount(result.getErrorCount() + 1);
                        continue;
                    }

                    if (price == null || price <= 0) {
                        result.getErrors().add("Dòng " + humanRowNum + ": Giá bán không hợp lệ (phải là số nguyên dương).");
                        result.setErrorCount(result.getErrorCount() + 1);
                        continue;
                    }

                    // Tự sinh SKU nếu dòng thiếu
                    if (sku.isBlank()) {
                        sku = "SKU-" + categoryCode.toUpperCase() + "-" + System.currentTimeMillis() + "-" + r;
                        result.getWarnings().add("Dòng " + humanRowNum + ": Thiếu SKU, hệ thống tự cấp mã: " + sku);
                    }

                    // Parse specs
                    Map<String, Object> specsMap = parseSpecs(specsRaw);

                    // Parse images
                    List<String> imageUrls = parseImageUrls(imagesRaw);

                    // ── 2. Upsert Sản phẩm ─────────────────────────────────────
                    Optional<Product> existingOpt = productRepository.findBySku(sku);
                    Product product;
                    boolean isUpdate = existingOpt.isPresent();

                    if (isUpdate) {
                        product = existingOpt.get();
                        product.setName(name);
                        product.setCategory(category);
                        if (!brand.isBlank()) product.setBrand(brand);
                        product.setPrice(price);
                        if (stock != null) product.setStockQuantity(stock);
                        if (statusVal != null) product.setIsActive(statusVal == 1);
                        if (avgRating != null) product.setAvgRating(avgRating);
                        if (reviewCount != null) product.setReviewCount(reviewCount);
                        if (!productUrl.isBlank()) product.setProductUrl(productUrl);
                        if (!specsMap.isEmpty()) product.setSpecs(specsMap);

                        result.setUpdatedCount(result.getUpdatedCount() + 1);
                    } else {
                        product = Product.builder()
                                .sku(sku)
                                .name(name)
                                .category(category)
                                .brand(!brand.isBlank() ? brand : "Khác")
                                .price(price)
                                .stockQuantity(stock != null ? stock : 10)
                                .isActive(statusVal == null || statusVal == 1)
                                .avgRating(avgRating != null ? avgRating : BigDecimal.ZERO)
                                .reviewCount(reviewCount != null ? reviewCount : 0)
                                .productUrl(!productUrl.isBlank() ? productUrl : null)
                                .specs(specsMap)
                                .build();

                        result.setCreatedCount(result.getCreatedCount() + 1);
                    }

                    // Cập nhật danh sách ảnh
                    if (!imageUrls.isEmpty()) {
                        if (product.getImages() == null) {
                            product.setImages(new ArrayList<>());
                        } else {
                            product.getImages().clear();
                        }

                        boolean isFirst = true;
                        for (String url : imageUrls) {
                            product.getImages().add(ProductImage.builder()
                                    .product(product)
                                    .imageUrl(url)
                                    .isPrimary(isFirst)
                                    .build());
                            isFirst = false;
                        }
                    }

                    productRepository.save(product);
                    result.setSuccessCount(result.getSuccessCount() + 1);

                } catch (Exception ex) {
                    log.error("[ProductExcel] Error importing row {}: {}", humanRowNum, ex.getMessage());
                    result.getErrors().add("Dòng " + humanRowNum + ": Lỗi xử lý dữ liệu (" + ex.getMessage() + ")");
                    result.setErrorCount(result.getErrorCount() + 1);
                }
            }

            // Dọn dẹp Cache hệ thống sau khi nạp sản phẩm mới
            evictAllProductCaches();
            log.info("[ProductExcel] Import finished: {} total, {} success ({} created, {} updated), {} errors",
                    result.getTotalRows(), result.getSuccessCount(), result.getCreatedCount(),
                    result.getUpdatedCount(), result.getErrorCount());
        }

        return result;
    }

    private void evictAllProductCaches() {
        try {
            if (cacheManager != null) {
                var c1 = cacheManager.getCache("featuredProducts");
                if (c1 != null) c1.clear();
                var c2 = cacheManager.getCache("categoryFacets");
                if (c2 != null) c2.clear();
                var c3 = cacheManager.getCache("productDetails");
                if (c3 != null) c3.clear();
                var c4 = cacheManager.getCache("queryCriteria");
                if (c4 != null) c4.clear();
            }
        } catch (Exception ex) {
            log.warn("[ProductExcel] Failed to clear caches after import: {}", ex.getMessage());
        }
    }

    // ── Helper parsing methods ────────────────────────────────────────────────

    private Map<String, Object> parseSpecs(String specsRaw) {
        if (specsRaw == null || specsRaw.isBlank()) {
            return new HashMap<>();
        }
        String trimmed = specsRaw.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
                return objectMapper.readValue(trimmed, new TypeReference<Map<String, Object>>() {});
            } catch (Exception ex) {
                log.warn("[ProductExcel] Could not parse JSON specs: {}", trimmed);
            }
        }

        // Fallback parse dạng key: value; key2: value2
        Map<String, Object> map = new HashMap<>();
        String[] pairs = trimmed.split("[;,\n]");
        for (String pair : pairs) {
            String[] kv = pair.split("[:=]", 2);
            if (kv.length == 2 && !kv[0].isBlank()) {
                String k = kv[0].trim().toLowerCase();
                String v = kv[1].trim();
                try {
                    if (v.matches("^-?\\d+$")) {
                        map.put(k, Long.parseLong(v));
                    } else if (v.matches("^-?\\d*\\.\\d+$")) {
                        map.put(k, Double.parseDouble(v));
                    } else {
                        map.put(k, v);
                    }
                } catch (Exception ignored) {
                    map.put(k, v);
                }
            }
        }
        return map;
    }

    private List<String> parseImageUrls(String raw) {
        if (raw == null || raw.isBlank()) return Collections.emptyList();
        return Arrays.stream(raw.split("[,;\n]"))
                .map(String::trim)
                .filter(s -> !s.isBlank() && (s.startsWith("http://") || s.startsWith("https://")))
                .collect(Collectors.toList());
    }

    private boolean isRowEmpty(Row row) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK && !getCellStringValue(cell).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double val = cell.getNumericCellValue();
                if (val == Math.floor(val)) {
                    yield String.valueOf((long) val);
                }
                yield String.valueOf(val);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue();
                } catch (Exception e) {
                    yield String.valueOf(cell.getNumericCellValue());
                }
            }
            default -> "";
        };
    }

    private Long getCellLongValue(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return (long) cell.getNumericCellValue();
            } else if (cell.getCellType() == CellType.STRING) {
                String clean = cell.getStringCellValue().replaceAll("[^0-9]", "");
                return clean.isBlank() ? null : Long.parseLong(clean);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private Integer getCellIntValue(Cell cell) {
        Long val = getCellLongValue(cell);
        return val != null ? val.intValue() : null;
    }

    private BigDecimal getCellBigDecimalValue(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return BigDecimal.valueOf(cell.getNumericCellValue());
            } else if (cell.getCellType() == CellType.STRING) {
                String clean = cell.getStringCellValue().replaceAll("[^0-9.]", "");
                return clean.isBlank() ? null : new BigDecimal(clean);
            }
        } catch (Exception ignored) {}
        return null;
    }

    // ── Styles ────────────────────────────────────────────────────────────────

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        XSSFFont font = ((XSSFWorkbook) workbook).createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);

        // Màu nền Navy sang trọng (#1E3A8A)
        style.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 30, (byte) 58, (byte) 138}, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        addBorders(style);
        return style;
    }

    private CellStyle createBorderedStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        addBorders(style);
        return style;
    }

    private CellStyle createCenterStyle(Workbook workbook) {
        CellStyle style = createBorderedStyle(workbook);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = createBorderedStyle(workbook);
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0"));
        style.setAlignment(HorizontalAlignment.RIGHT);
        return style;
    }

    private CellStyle createDecimalStyle(Workbook workbook) {
        CellStyle style = createBorderedStyle(workbook);
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("0.0"));
        style.setAlignment(HorizontalAlignment.RIGHT);
        return style;
    }

    private void addBorders(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setBottomBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setLeftBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setRightBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
    }
}

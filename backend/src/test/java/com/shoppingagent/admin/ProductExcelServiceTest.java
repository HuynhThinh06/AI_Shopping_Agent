package com.shoppingagent.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shoppingagent.admin.dto.ProductExcelImportResultDTO;
import com.shoppingagent.product.CategoryRepository;
import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.shared.entity.Category;
import com.shoppingagent.shared.entity.Product;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProductExcelService — Kiểm thử chức năng Nhập/Xuất Excel cho Quản trị viên")
class ProductExcelServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private CacheManager cacheManager;

    @Mock
    private Cache cache;

    private ObjectMapper objectMapper;
    private ProductExcelService productExcelService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        productExcelService = new ProductExcelService(productRepository, categoryRepository, objectMapper, cacheManager);
    }

    @Test
    @DisplayName("Xuất Excel: Tạo file .xlsx hợp lệ kèm đầy đủ các cột và dữ liệu")
    void shouldExportProductsToExcelProperly() throws Exception {
        Category laptopCat = Category.builder().code("laptop").name("Laptop").build();
        Product p1 = Product.builder()
                .id(1L)
                .sku("LAP-ASUS-01")
                .name("Asus Zenbook 14")
                .category(laptopCat)
                .brand("Asus")
                .price(22_000_000L)
                .stockQuantity(15)
                .isActive(true)
                .avgRating(new BigDecimal("4.8"))
                .reviewCount(10)
                .specs(Map.of("ram", 16, "cpu", "i7"))
                .build();

        when(productRepository.findForExport("laptop", "")).thenReturn(List.of(p1));

        byte[] excelBytes = productExcelService.exportProductsToExcel("laptop", "");
        assertThat(excelBytes).isNotEmpty();

        // Kiểm tra nội dung file Excel vừa tạo
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(excelBytes))) {
            Sheet sheet = wb.getSheet("Danh sách sản phẩm");
            assertThat(sheet).isNotNull();
            Row headerRow = sheet.getRow(0);
            assertThat(headerRow.getCell(1).getStringCellValue()).contains("SKU");
            assertThat(headerRow.getCell(2).getStringCellValue()).contains("Tên sản phẩm");

            Row dataRow = sheet.getRow(1);
            assertThat(dataRow.getCell(1).getStringCellValue()).isEqualTo("LAP-ASUS-01");
            assertThat(dataRow.getCell(2).getStringCellValue()).isEqualTo("Asus Zenbook 14");
            assertThat(dataRow.getCell(5).getStringCellValue()).isEqualTo("Asus");
            assertThat(dataRow.getCell(6).getNumericCellValue()).isEqualTo(22_000_000.0);
        }
    }

    @Test
    @DisplayName("Tải file mẫu: Sinh file template chứa 2 dòng mẫu và sheet hướng dẫn")
    void shouldGenerateExcelTemplateProperly() throws Exception {
        byte[] templateBytes = productExcelService.generateExcelTemplate();
        assertThat(templateBytes).isNotEmpty();

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(templateBytes))) {
            assertThat(wb.getNumberOfSheets()).isEqualTo(2);
            Sheet sampleSheet = wb.getSheet("Nhập sản phẩm mẫu");
            assertThat(sampleSheet).isNotNull();
            assertThat(sampleSheet.getLastRowNum()).isGreaterThanOrEqualTo(2);

            Sheet guideSheet = wb.getSheet("Quy định nhập dữ liệu");
            assertThat(guideSheet).isNotNull();
        }
    }

    @Test
    @DisplayName("Nhập Excel: Thêm mới sản phẩm thành công từ file hợp lệ")
    void shouldImportNewProductsSuccessfully() throws Exception {
        Category laptopCat = Category.builder().code("laptop").name("Laptop").build();
        when(categoryRepository.findByCode("laptop")).thenReturn(Optional.of(laptopCat));
        when(productRepository.findBySku("NEW-SKU-01")).thenReturn(Optional.empty());
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        // Tạo file excel giả lập trên bộ nhớ
        byte[] excelData;
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Import");
            Row h = sheet.createRow(0);
            h.createCell(1).setCellValue("SKU (*)");
            h.createCell(2).setCellValue("Tên sản phẩm (*)");
            h.createCell(3).setCellValue("Mã ngành hàng (*)");
            h.createCell(5).setCellValue("Thương hiệu");
            h.createCell(6).setCellValue("Giá bán (VNĐ) (*)");
            h.createCell(7).setCellValue("Tồn kho");

            Row r1 = sheet.createRow(1);
            r1.createCell(1).setCellValue("NEW-SKU-01");
            r1.createCell(2).setCellValue("Dell Inspiron 15");
            r1.createCell(3).setCellValue("laptop");
            r1.createCell(5).setCellValue("Dell");
            r1.createCell(6).setCellValue(18500000);
            r1.createCell(7).setCellValue(25);

            wb.write(out);
            excelData = out.toByteArray();
        }

        MockMultipartFile file = new MockMultipartFile("file", "import_test.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelData);

        ProductExcelImportResultDTO result = productExcelService.importProductsFromExcel(file);

        assertThat(result.getTotalRows()).isEqualTo(1);
        assertThat(result.getSuccessCount()).isEqualTo(1);
        assertThat(result.getCreatedCount()).isEqualTo(1);
        assertThat(result.getUpdatedCount()).isEqualTo(0);
        assertThat(result.getErrorCount()).isEqualTo(0);

        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    @DisplayName("Nhập Excel: Báo cáo lỗi chi tiết khi dòng thiếu tên, sai giá hoặc ngành hàng không tồn tại")
    void shouldReportErrorsOnInvalidRowsWithoutCrashing() throws Exception {
        when(categoryRepository.findByCode("tablet")).thenReturn(Optional.empty());

        byte[] excelData;
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Import");
            Row h = sheet.createRow(0);
            h.createCell(1).setCellValue("SKU (*)");
            h.createCell(2).setCellValue("Tên sản phẩm (*)");
            h.createCell(3).setCellValue("Mã ngành hàng (*)");
            h.createCell(6).setCellValue("Giá bán (*)");

            // Dòng 2: Thiếu tên sản phẩm
            Row r1 = sheet.createRow(1);
            r1.createCell(1).setCellValue("ERR-SKU-01");
            r1.createCell(2).setCellValue(""); // Tên rỗng
            r1.createCell(3).setCellValue("laptop");
            r1.createCell(6).setCellValue(10000000);

            // Dòng 3: Ngành hàng 'tablet' chưa tồn tại
            Row r2 = sheet.createRow(2);
            r2.createCell(1).setCellValue("ERR-SKU-02");
            r2.createCell(2).setCellValue("iPad Air");
            r2.createCell(3).setCellValue("tablet"); // Không có trong DB
            r2.createCell(6).setCellValue(15000000);

            wb.write(out);
            excelData = out.toByteArray();
        }

        MockMultipartFile file = new MockMultipartFile("file", "invalid_import.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelData);

        ProductExcelImportResultDTO result = productExcelService.importProductsFromExcel(file);

        assertThat(result.getTotalRows()).isEqualTo(2);
        assertThat(result.getErrorCount()).isEqualTo(2);
        assertThat(result.getSuccessCount()).isEqualTo(0);
        assertThat(result.getErrors()).hasSize(2);
        assertThat(result.getErrors().get(0)).contains("Tên sản phẩm không được để trống");
        assertThat(result.getErrors().get(1)).contains("Ngành hàng 'tablet' không tồn tại");
    }

    @Test
    @DisplayName("Từ chối file rỗng hoặc sai phần mở rộng")
    void shouldRejectInvalidFileFormats() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.txt", "text/plain", new byte[0]);
        assertThatThrownBy(() -> productExcelService.importProductsFromExcel(emptyFile))
                .isInstanceOf(IllegalArgumentException.class);

        MockMultipartFile wrongExtFile = new MockMultipartFile("file", "test.pdf", "application/pdf", new byte[]{1, 2, 3});
        assertThatThrownBy(() -> productExcelService.importProductsFromExcel(wrongExtFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Định dạng file không hợp lệ");
    }
}

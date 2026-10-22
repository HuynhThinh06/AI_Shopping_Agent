package com.shoppingagent.product;

import com.shoppingagent.product.dto.CategoryFacetDTO;
import com.shoppingagent.product.dto.FacetOptionDTO;
import com.shoppingagent.shared.entity.CategoryAttribute;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Service quản lý siêu dữ liệu bộ lọc động (Metadata-Driven Facets) cho từng ngành hàng.
 * Phục vụ nguyên lý OCP (Open-Closed Principle): Cho phép mở rộng chip và tiện ích từ Backend
 * mà không cần sửa code giao diện Frontend.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryFacetService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    /**
     * Lấy cấu hình các nhóm bộ lọc cho một ngành hàng cụ thể.
     *
     * @param categoryCode mã ngành hàng (vd: 'laptop', 'phone')
     * @return Danh sách các nhóm bộ lọc động
     */
    @org.springframework.cache.annotation.Cacheable(value = "categoryFacets", key = "#categoryCode != null ? #categoryCode.trim().toLowerCase() : 'laptop'")
    public List<CategoryFacetDTO> getFacetsForCategory(String categoryCode) {
        String cleanCode = (categoryCode != null ? categoryCode.trim().toLowerCase() : "laptop");
        List<CategoryAttribute> attributes = categoryRepository.findByCategoryCodeAndFilterable(cleanCode);

        List<CategoryFacetDTO> facetGroups = new ArrayList<>();

        // 1. Nhóm Thương hiệu (Dynamic Data-Driven Brands từ DB)
        facetGroups.add(buildBrandFacetGroup(cleanCode));

        // 2. Nhóm Mức giá (Price Presets)
        facetGroups.add(buildPriceFacetGroup(cleanCode));

        // 3. Nhóm Chipset / CPU (Dynamic Processor Generations)
        facetGroups.add(buildChipsetFacetGroup(cleanCode));

        // 4. Nhóm Dung lượng RAM
        facetGroups.add(buildRamFacetGroup(cleanCode));

        // 5. Nhóm Tính năng & Tiện ích nổi bật (Key Features)
        facetGroups.add(buildFeatureFacetGroup(cleanCode));

        return facetGroups;
    }

    private CategoryFacetDTO buildPriceFacetGroup(String categoryCode) {
        List<FacetOptionDTO> options = new ArrayList<>();
        if ("phone".equals(categoryCode)) {
            options.add(FacetOptionDTO.builder().id("p1").label("< 5 triệu").min(0L).max(5000000L).build());
            options.add(FacetOptionDTO.builder().id("p2").label("5 - 10 triệu").min(5000000L).max(10000000L).build());
            options.add(FacetOptionDTO.builder().id("p3").label("10 - 15 triệu").min(10000000L).max(15000000L).build());
            options.add(FacetOptionDTO.builder().id("p4").label("15 - 20 triệu").min(15000000L).max(20000000L).build());
            options.add(FacetOptionDTO.builder().id("p5").label("Trên 20 triệu").min(20000000L).max(null).build());
        } else {
            // laptop / default
            options.add(FacetOptionDTO.builder().id("p1").label("< 15 triệu").min(0L).max(15000000L).build());
            options.add(FacetOptionDTO.builder().id("p2").label("15 - 20 triệu").min(15000000L).max(20000000L).build());
            options.add(FacetOptionDTO.builder().id("p3").label("20 - 25 triệu").min(20000000L).max(25000000L).build());
            options.add(FacetOptionDTO.builder().id("p4").label("25 - 30 triệu").min(25000000L).max(30000000L).build());
            options.add(FacetOptionDTO.builder().id("p5").label("Trên 30 triệu").min(30000000L).max(null).build());
        }

        return CategoryFacetDTO.builder()
                .groupKey("price")
                .groupLabel("Mức giá")
                .filterType("preset")
                .options(options)
                .build();
    }

    private CategoryFacetDTO buildChipsetFacetGroup(String categoryCode) {
        List<FacetOptionDTO> options = new ArrayList<>();
        if ("phone".equals(categoryCode)) {
            options.add(FacetOptionDTO.builder()
                    .id("apple_a")
                    .label("Apple A-Series Bionic")
                    .queryPattern("apple|bionic|a15|a16|a17|a18")
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("snapdragon")
                    .label("Snapdragon (Qualcomm)")
                    .queryPattern("snapdragon|qualcomm|8 gen|7 gen|778|695|870|888")
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("dimensity")
                    .label("MediaTek Dimensity / Helio")
                    .queryPattern("dimensity|helio|mediatek|mtk")
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("exynos")
                    .label("Samsung Exynos")
                    .queryPattern("exynos")
                    .build());
        } else {
            // laptop
            options.add(FacetOptionDTO.builder()
                    .id("intel_ultra")
                    .label("Intel Core Ultra (AI Boost)")
                    .queryPattern("ultra|core ultra|125h|155h|165h")
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("intel_core_i7_i9")
                    .label("Intel Core i7 / i9 / Core 7")
                    .queryPattern("i7|i9|core 7|13700|13620|13650|14700|14900|150u")
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("intel_core_i5")
                    .label("Intel Core i5 / Core 5")
                    .queryPattern("i5|core 5|13420|13450|13500|12450|12500|1334u")
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("intel_core_i3")
                    .label("Intel Core i3 / Core 3")
                    .queryPattern("i3|core 3|1215u|1315u")
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("amd_ryzen")
                    .label("AMD Ryzen (5 / 7 / 8000 Series)")
                    .queryPattern("ryzen|amd|7535|7735|7840|8845")
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("apple_m")
                    .label("Apple Silicon (M1 / M2 / M3 / M4)")
                    .queryPattern("apple|m1|m2|m3|m4")
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("snapdragon")
                    .label("Snapdragon X Elite / Plus")
                    .queryPattern("snapdragon|x elite|x plus")
                    .build());
        }

        return CategoryFacetDTO.builder()
                .groupKey("chipset")
                .groupLabel("Thế hệ Chip xử lý")
                .filterType("multiselect")
                .options(options)
                .build();
    }

    private CategoryFacetDTO buildRamFacetGroup(String categoryCode) {
        List<FacetOptionDTO> options = new ArrayList<>();
        if ("phone".equals(categoryCode)) {
            for (String r : List.of("4GB", "6GB", "8GB", "12GB", "16GB")) {
                options.add(FacetOptionDTO.builder().id(r.toLowerCase()).label(r).queryPattern(r).build());
            }
        } else {
            for (String r : List.of("8GB", "16GB", "32GB", "64GB")) {
                options.add(FacetOptionDTO.builder().id(r.toLowerCase()).label(r).queryPattern(r).build());
            }
        }

        return CategoryFacetDTO.builder()
                .groupKey("ram")
                .groupLabel("Dung lượng RAM")
                .filterType("multiselect")
                .options(options)
                .build();
    }

    private CategoryFacetDTO buildFeatureFacetGroup(String categoryCode) {
        List<FacetOptionDTO> options = new ArrayList<>();
        if ("phone".equals(categoryCode)) {
            options.add(FacetOptionDTO.builder()
                    .id("phone_camera")
                    .label("Camera xịn (≥ 50MP / OIS)")
                    .specKey("camera")
                    .operator(">=")
                    .value(50)
                    .queryPattern("50mp|108mp|200mp|ois")
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("phone_battery")
                    .label("Pin trâu (≥ 5000 mAh)")
                    .specKey("battery")
                    .operator(">=")
                    .value(5000)
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("phone_amoled")
                    .label("Màn hình AMOLED / 120Hz")
                    .specKey("refresh_rate")
                    .queryPattern("amoled|120hz|oled")
                    .build());
        } else {
            // laptop
            options.add(FacetOptionDTO.builder()
                    .id("screen_high_hz")
                    .label("Màn hình tần số cao (≥ 90Hz / 120Hz)")
                    .specKey("refresh_rate")
                    .operator(">=")
                    .value(90)
                    .queryPattern("90hz|120hz|144hz|165hz")
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("screen_large")
                    .label("Màn hình lớn (≥ 15.6 inch)")
                    .specKey("screen_size")
                    .operator(">=")
                    .value(15.6)
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("screen_compact")
                    .label("Màn hình gọn nhẹ (≤ 14.0 inch)")
                    .specKey("screen_size")
                    .operator("<=")
                    .value(14.0)
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("pin_high")
                    .label("Pin dung lượng cao (≥ 50 Wh)")
                    .specKey("battery")
                    .operator(">=")
                    .value(50)
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("ultra_light")
                    .label("Mỏng nhẹ di động (≤ 1.5 kg)")
                    .specKey("weight")
                    .operator("<=")
                    .value(1.5)
                    .build());
            options.add(FacetOptionDTO.builder()
                    .id("discrete_gpu")
                    .label("Có Card đồ họa rời (RTX / GTX)")
                    .specKey("gpu")
                    .queryPattern("rtx|gtx|geforce|radeon rx|dedicated")
                    .build());
        }

        return CategoryFacetDTO.builder()
                .groupKey("feature")
                .groupLabel("Tính năng & Tiện ích nổi bật")
                .filterType("multiselect")
                .options(options)
                .build();
    }

    private CategoryFacetDTO buildBrandFacetGroup(String categoryCode) {
        List<Object[]> brandCounts = productRepository.findBrandCountsByCategoryCode(categoryCode);
        List<FacetOptionDTO> options = new ArrayList<>();
        for (Object[] row : brandCounts) {
            if (row != null && row[0] != null) {
                String brand = row[0].toString().trim();
                Long count = row[1] instanceof Number ? ((Number) row[1]).longValue() : 0L;
                options.add(FacetOptionDTO.builder()
                        .id(brand.toLowerCase())
                        .label(brand + " (" + count + ")")
                        .queryPattern(brand.toLowerCase())
                        .build());
            }
        }
        return CategoryFacetDTO.builder()
                .groupKey("brand")
                .groupLabel("Thương hiệu")
                .filterType("multiselect")
                .options(options)
                .build();
    }
}

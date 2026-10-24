package com.shoppingagent.product.dto;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductUpdateRequest {
    private String categoryCode;
    private String sku;
    private String name;
    private String brand;

    @Min(value = 0, message = "Giá sản phẩm phải lớn hơn hoặc bằng 0")
    private Long price;

    @Min(value = 0, message = "Số lượng tồn kho phải lớn hơn hoặc bằng 0")
    private Integer stockQuantity;

    private String productUrl;
    private Map<String, Object> specs;
    private List<String> imageUrls;
    private Boolean isActive;
}

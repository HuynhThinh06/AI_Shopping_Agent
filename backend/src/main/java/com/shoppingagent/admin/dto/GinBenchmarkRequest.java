package com.shoppingagent.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GinBenchmarkRequest {
    @Builder.Default
    private String categoryCode = "laptop";

    @Builder.Default
    private String specKey = "ram";

    @Builder.Default
    private String specValue = "16";

    @Builder.Default
    private int iterations = 10;
}

package com.shoppingagent.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductExcelImportResultDTO {
    private int totalRows;
    private int successCount;
    private int createdCount;
    private int updatedCount;
    private int errorCount;
    @Builder.Default
    private List<String> errors = new ArrayList<>();
    @Builder.Default
    private List<String> warnings = new ArrayList<>();
}

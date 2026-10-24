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
public class BulkActionResultDTO {
    private String action;
    private int requested;
    private int processed;
    @Builder.Default
    private List<Long> skippedIds = new ArrayList<>();
}

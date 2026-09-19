package com.shoppingagent.search.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/** Response trả về cho endpoint POST /api/search */
@Data
@Builder
public class SearchResponse {

    /** ID bản ghi search_query đã lưu (dùng cho Ground Truth labeling) */
    private Long queryId;

    /** Tiêu chí LLM đã trích xuất được (hiển thị để user kiểm tra) */
    private ExtractedCriteria extractedCriteria;

    /** Danh sách sản phẩm đã xếp hạng (top K) */
    private List<RankedProduct> results;

    /** Tổng số sản phẩm khớp trước khi cắt top-K */
    private Integer totalMatched;
}

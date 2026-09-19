package com.shoppingagent.search.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SearchRequest {

    /** Câu hỏi ngôn ngữ tự nhiên của người dùng */
    @NotBlank(message = "Query text must not be blank")
    private String queryText;

    /** Session ID cho khách vãng lai (tuỳ chọn) */
    private String sessionId;

    /** Số lượng sản phẩm tối đa trả về (mặc định 10) */
    private Integer topK = 10;
}

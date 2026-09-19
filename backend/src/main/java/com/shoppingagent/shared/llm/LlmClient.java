package com.shoppingagent.shared.llm;

import com.shoppingagent.search.dto.ExtractedCriteria;
import com.shoppingagent.review.dto.SummaryDTO;

import java.util.List;

/**
 * Interface trừu tượng cho LLM client.
 * Các service inject interface này — không import GeminiClient trực tiếp.
 * Giúp dễ dàng swap sang OpenAI hoặc mock trong unit test.
 */
public interface LlmClient {

    /**
     * Gọi LLM để trích xuất ràng buộc từ câu truy vấn ngôn ngữ tự nhiên.
     *
     * @param queryText          Câu hỏi gốc của người dùng
     * @param categoryCode       Mã ngành hàng đã xác định (laptop / phone)
     * @param filterableAttributes Danh sách attribute_key filterable của ngành hàng
     * @return ExtractedCriteria chứa budget, requiredSpecs, ...
     */
    ExtractedCriteria extractCriteria(String queryText,
                                      String categoryCode,
                                      List<String> filterableAttributes);

    /**
     * Gọi LLM để tóm tắt danh sách review thành ưu/nhược điểm.
     *
     * @param productName    Tên sản phẩm (để LLM có context)
     * @param reviewContents Danh sách nội dung review đã lọc rác
     * @return SummaryDTO chứa summaryText, pros, cons
     */
    SummaryDTO summarizeReviews(String productName, List<String> reviewContents);
}

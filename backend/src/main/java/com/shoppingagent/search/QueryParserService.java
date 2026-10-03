package com.shoppingagent.search;

import com.shoppingagent.product.CategoryRepository;
import com.shoppingagent.search.dto.ExtractedCriteria;
import com.shoppingagent.shared.entity.Category;
import com.shoppingagent.shared.entity.CategoryAttribute;
import com.shoppingagent.shared.llm.LlmClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Dịch câu truy vấn ngôn ngữ tự nhiên → ExtractedCriteria có cấu trúc.
 *
 * Luồng:
 * 1. Xác định ngành hàng (từ categoryCode đã biết, hoặc để LLM tự detect)
 * 2. Lấy danh sách attribute filterable từ DB
 * 3. Gọi LlmClient.extractCriteria() với Structured Output
 * 4. Trả ExtractedCriteria
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QueryParserService {

    private final LlmClient llmClient;
    private final CategoryRepository categoryRepository;
    private final CriteriaValidator criteriaValidator;

    /**
     * @param queryText    Câu hỏi gốc
     * @param categoryCode Mã ngành hàng (nếu đã biết trước)
     */
    public ExtractedCriteria parse(String queryText, String categoryCode) {
        log.info("[QueryParser] Parsing query: '{}' for category: {}", queryText, categoryCode);

        // Lấy danh sách attribute key để inject vào prompt
        List<String> filterableKeys = categoryRepository
                .findByCategoryCodeAndFilterable(categoryCode)
                .stream()
                .map(CategoryAttribute::getAttributeKey)
                .toList();

        log.debug("[QueryParser] Filterable attributes for '{}': {}", categoryCode, filterableKeys);

        ExtractedCriteria criteria = llmClient.extractCriteria(queryText, categoryCode, filterableKeys);
        criteria = criteriaValidator.validate(criteria);

        log.info("[QueryParser] Extracted & Validated: budget=[{},{}], target={}, specs={}",
                criteria.getBudgetMin(), criteria.getBudgetMax(), criteria.getTarget(), criteria.getRequiredSpecs());
        return criteria;
    }
}

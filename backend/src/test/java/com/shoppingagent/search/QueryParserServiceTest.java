package com.shoppingagent.search;

import com.shoppingagent.product.CategoryRepository;
import com.shoppingagent.search.dto.ExtractedCriteria;
import com.shoppingagent.shared.entity.CategoryAttribute;
import com.shoppingagent.shared.llm.LlmClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("QueryParserService — Kiểm thử luồng trích xuất ràng buộc qua LLM & Validator")
class QueryParserServiceTest {

    @Mock
    private LlmClient llmClient;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private CriteriaValidator criteriaValidator;

    @InjectMocks
    private QueryParserService queryParserService;

    @Test
    @DisplayName("Lấy danh sách thuộc tính có thể lọc, gọi LLM Client và chuyển qua CriteriaValidator")
    void shouldExtractCriteriaAndValidateProperly() {
        String query = "Laptop sinh viên 15 triệu RAM 8GB";
        String categoryCode = "laptop";

        CategoryAttribute attr1 = CategoryAttribute.builder().attributeKey("ram").isFilterable(true).build();
        CategoryAttribute attr2 = CategoryAttribute.builder().attributeKey("cpu").isFilterable(true).build();
        when(categoryRepository.findByCategoryCodeAndFilterable(categoryCode)).thenReturn(List.of(attr1, attr2));

        ExtractedCriteria rawFromLlm = new ExtractedCriteria();
        rawFromLlm.setCategoryCode("laptop");
        rawFromLlm.setBudgetMax(15L); // LLM có thể trả 15 thay vì 15.000.000
        rawFromLlm.setTarget("student");
        rawFromLlm.setRequiredSpecs(Map.of("ram", "8"));

        ExtractedCriteria validated = new ExtractedCriteria();
        validated.setCategoryCode("laptop");
        validated.setBudgetMax(15_000_000L);
        validated.setTarget("student");
        validated.setRequiredSpecs(Map.of("ram", "8"));

        when(llmClient.extractCriteria(eq(query), eq(categoryCode), eq(List.of("ram", "cpu"))))
                .thenReturn(rawFromLlm);
        when(criteriaValidator.validate(rawFromLlm)).thenReturn(validated);

        // Act
        ExtractedCriteria result = queryParserService.parse(query, categoryCode);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getBudgetMax()).isEqualTo(15_000_000L);
        assertThat(result.getTarget()).isEqualTo("student");
        assertThat(result.getRequiredSpecs()).containsEntry("ram", "8");

        verify(categoryRepository).findByCategoryCodeAndFilterable(categoryCode);
        verify(llmClient).extractCriteria(eq(query), eq(categoryCode), eq(List.of("ram", "cpu")));
        verify(criteriaValidator).validate(rawFromLlm);
    }
}

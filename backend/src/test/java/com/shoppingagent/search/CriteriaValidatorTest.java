package com.shoppingagent.search;

import com.shoppingagent.search.dto.ExtractedCriteria;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CriteriaValidator — Kiểm thử lớp validate và chuẩn hóa ràng buộc nghiệp vụ")
class CriteriaValidatorTest {

    private CriteriaValidator validator;

    @BeforeEach
    void setUp() {
        validator = new CriteriaValidator();
    }

    @Test
    @DisplayName("Reset budgetMax hoặc budgetMin về null nếu <= 0")
    void shouldResetBudgetToNullWhenZeroOrNegative() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        criteria.setBudgetMax(0L);
        criteria.setBudgetMin(-1000L);

        ExtractedCriteria result = validator.validate(criteria);

        assertThat(result.getBudgetMax()).isNull();
        assertThat(result.getBudgetMin()).isNull();
    }

    @Test
    @DisplayName("Chuyển đổi đơn vị 'triệu' nếu LLM trả số nhỏ hơn 100k VNĐ (vd: 15 -> 15.000.000)")
    void shouldConvertMillionUnitsWhenBudgetTooSmall() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        criteria.setBudgetMin(10L);
        criteria.setBudgetMax(25L);

        ExtractedCriteria result = validator.validate(criteria);

        assertThat(result.getBudgetMin()).isEqualTo(10_000_000L);
        assertThat(result.getBudgetMax()).isEqualTo(25_000_000L);
    }

    @Test
    @DisplayName("Tự động hoán đổi khi budgetMin > budgetMax")
    void shouldSwapWhenBudgetMinGreaterThanBudgetMax() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        criteria.setBudgetMin(20_000_000L);
        criteria.setBudgetMax(15_000_000L);

        ExtractedCriteria result = validator.validate(criteria);

        assertThat(result.getBudgetMin()).isEqualTo(15_000_000L);
        assertThat(result.getBudgetMax()).isEqualTo(20_000_000L);
    }

    @Test
    @DisplayName("Giới hạn trần ngân sách nếu vượt quá 500 triệu VNĐ")
    void shouldCapBudgetWhenExceedingMaximumCeiling() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        criteria.setBudgetMax(999_999_999L);

        ExtractedCriteria result = validator.validate(criteria);

        assertThat(result.getBudgetMax()).isEqualTo(500_000_000L);
    }

    @Test
    @DisplayName("Chuẩn hóa requiredSpecs: trim khoảng trắng và loại bỏ key/value rỗng")
    void shouldCleanAndTrimRequiredSpecs() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        Map<String, String> specs = new HashMap<>();
        specs.put(" RAM ", " 16 ");
        specs.put("cpu", "");
        specs.put("   ", "validValue");
        specs.put("storage", " 512 ");
        criteria.setRequiredSpecs(specs);

        ExtractedCriteria result = validator.validate(criteria);

        assertThat(result.getRequiredSpecs())
                .containsEntry("ram", "16")
                .containsEntry("storage", "512")
                .doesNotContainKey("cpu")
                .doesNotContainKey("   ");
    }

    @Test
    @DisplayName("Chuẩn hóa target: trim và chuyển về chữ thường, chuyển rỗng thành null")
    void shouldNormalizeTarget() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        criteria.setTarget("  STUDENT  ");

        ExtractedCriteria result = validator.validate(criteria);
        assertThat(result.getTarget()).isEqualTo("student");

        criteria.setTarget("   ");
        result = validator.validate(criteria);
        assertThat(result.getTarget()).isNull();
    }
}

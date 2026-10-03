package com.shoppingagent.search;

import com.shoppingagent.search.dto.ExtractedCriteria;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CriteriaValidatorService — Kiểm thử lớp validate và chuẩn hóa ràng buộc nghiệp vụ")
class CriteriaValidatorTest {

    private CriteriaValidatorService validatorService;

    @BeforeEach
    void setUp() {
        validatorService = new CriteriaValidatorService();
    }

    @Test
    @DisplayName("Reset budgetMax hoặc budgetMin về null nếu <= 0")
    void shouldResetBudgetToNullWhenZeroOrNegative() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        criteria.setBudgetMax(0L);
        criteria.setBudgetMin(-1000L);

        validatorService.validateAndNormalize(criteria);

        assertThat(criteria.getBudgetMax()).isNull();
        assertThat(criteria.getBudgetMin()).isNull();
    }

    @Test
    @DisplayName("Chuyển đổi đơn vị 'triệu' nếu LLM trả số nhỏ hơn 100k VNĐ (vd: 15 -> 15.000.000)")
    void shouldConvertMillionUnitsWhenBudgetTooSmall() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        criteria.setBudgetMin(10L);
        criteria.setBudgetMax(25L);

        validatorService.validateAndNormalize(criteria);

        assertThat(criteria.getBudgetMin()).isEqualTo(10_000_000L);
        assertThat(criteria.getBudgetMax()).isEqualTo(25_000_000L);
    }

    @Test
    @DisplayName("Tự động hoán đổi khi budgetMin > budgetMax")
    void shouldSwapWhenBudgetMinGreaterThanBudgetMax() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        criteria.setBudgetMin(20_000_000L);
        criteria.setBudgetMax(15_000_000L);

        validatorService.validateAndNormalize(criteria);

        assertThat(criteria.getBudgetMin()).isEqualTo(15_000_000L);
        assertThat(criteria.getBudgetMax()).isEqualTo(20_000_000L);
    }

    @Test
    @DisplayName("Giới hạn trần ngân sách nếu vượt quá 500 triệu VNĐ")
    void shouldCapBudgetWhenExceedingMaximumCeiling() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        criteria.setBudgetMax(999_999_999L);

        validatorService.validateAndNormalize(criteria);

        assertThat(criteria.getBudgetMax()).isEqualTo(500_000_000L);
    }

    @Test
    @DisplayName("Chuẩn hóa requiredSpecs: xóa hậu tố đơn vị (GB, TB, mAh...) và loại bỏ key/value rỗng")
    void shouldCleanAndTrimRequiredSpecs() {
        ExtractedCriteria criteria = new ExtractedCriteria();
        Map<String, String> specs = new HashMap<>();
        specs.put(" RAM ", " 16 GB ");
        specs.put("cpu", "");
        specs.put("   ", "validValue");
        specs.put("storage", " 512 TB ");
        criteria.setRequiredSpecs(specs);

        validatorService.validateAndNormalize(criteria);

        assertThat(criteria.getRequiredSpecs())
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

        validatorService.validateAndNormalize(criteria);
        assertThat(criteria.getTarget()).isEqualTo("student");

        criteria.setTarget("   ");
        validatorService.validateAndNormalize(criteria);
        assertThat(criteria.getTarget()).isNull();
    }
}

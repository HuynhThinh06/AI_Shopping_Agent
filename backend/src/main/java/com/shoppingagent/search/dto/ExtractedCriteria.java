package com.shoppingagent.search.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

/**
 * Kết quả LLM trích xuất từ câu truy vấn ngôn ngữ tự nhiên.
 * Được deserialize trực tiếp từ JSON response của Gemini.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExtractedCriteria {

    /** Mã ngành hàng: laptop / phone */
    private String categoryCode;

    /** Ngân sách tối đa (VNĐ), null nếu không đề cập */
    private Long budgetMax;

    /** Ngân sách tối thiểu (VNĐ), null nếu không đề cập */
    private Long budgetMin;

    /** Đối tượng người dùng: student, gamer, office, designer... null nếu không rõ */
    private String target;

    /**
     * Thông số kỹ thuật yêu cầu.
     * Key = attribute_key (vd: "ram"), Value = giá trị yêu cầu (vd: "16" hoặc ">=16")
     */
    private Map<String, String> requiredSpecs = new HashMap<>();

    private Double weightPrice;
    private Double weightRating;
    private Double weightSpec;
}


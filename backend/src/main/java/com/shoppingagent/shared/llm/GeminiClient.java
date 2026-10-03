package com.shoppingagent.shared.llm;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shoppingagent.review.dto.SummaryDTO;
import com.shoppingagent.search.dto.ExtractedCriteria;
import com.shoppingagent.shared.entity.LlmRequestLog;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Triển khai LlmClient dùng Google Gemini REST API.
 * Sử dụng Structured Output (responseSchema) để đảm bảo JSON output đúng format.
 * Có cơ chế retry tối đa {@code maxRetries} lần và ghi log mỗi lần gọi.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiClient implements LlmClient {

    private final ObjectMapper objectMapper;
    private final EntityManager entityManager;
    private final RestClient restClient = RestClient.create();

    @Value("${llm.gemini.api-key}")
    private String apiKey;

    @Value("${llm.gemini.model:gemini-2.0-flash}")
    private String model;

    @Value("${llm.gemini.max-retries:2}")
    private int maxRetries;

    // ─── Schema cho ExtractedCriteria ────────────────────────────────────────
    private static final Map<String, Object> CRITERIA_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.ofEntries(
                    Map.entry("categoryCode",   Map.of("type", "string")),
                    Map.entry("budgetMax",      Map.of("type", "number", "nullable", true)),
                    Map.entry("budgetMin",      Map.of("type", "number", "nullable", true)),
                    Map.entry("target",         Map.of("type", "string", "nullable", true)),
                    Map.entry("requiredSpecs",  Map.of("type", "object",
                            "additionalProperties", Map.of("type", "string")))
            ),
            "required", List.of("categoryCode", "requiredSpecs")
    );

    // ─── Schema cho SummaryResult ─────────────────────────────────────────────
    private static final Map<String, Object> SUMMARY_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "summaryText", Map.of("type", "string"),
                    "pros",        Map.of("type", "string"),
                    "cons",        Map.of("type", "string")
            ),
            "required", List.of("summaryText", "pros", "cons")
    );

    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public ExtractedCriteria extractCriteria(String queryText,
                                              String categoryCode,
                                              List<String> filterableAttributes) {
        String prompt = buildExtractionPrompt(queryText, categoryCode, filterableAttributes);
        String json = callWithRetry(prompt, CRITERIA_SCHEMA, "extract_query", null);
        try {
            ExtractedCriteria criteria = objectMapper.readValue(json, ExtractedCriteria.class);
            // Đảm bảo categoryCode luôn đúng (LLM có thể trả sai)
            criteria.setCategoryCode(categoryCode);
            return criteria;
        } catch (JsonProcessingException e) {
            log.error("Failed to parse extracted criteria JSON: {}", json, e);
            throw new LlmParseException("Cannot parse LLM extraction response", e);
        }
    }

    @Override
    public SummaryDTO summarizeReviews(String productName, List<String> reviewContents) {
        String prompt = buildSummarizationPrompt(productName, reviewContents);
        String json = callWithRetry(prompt, SUMMARY_SCHEMA, "summarize_review", null);
        try {
            return objectMapper.readValue(json, SummaryDTO.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse summary JSON: {}", json, e);
            throw new LlmParseException("Cannot parse LLM summarization response", e);
        }
    }

    // ─── Core: gọi Gemini API với retry ──────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String callWithRetry(String prompt,
                                  Map<String, Object> responseSchema,
                                  String requestType,
                                  Long queryId) {
        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":generateContent?key=" + apiKey;

        Map<String, Object> requestBody = buildRequestBody(prompt, responseSchema);
        String responseJson = null;
        String status = "failed";
        long startMs = System.currentTimeMillis();
        int attempt = 0;

        for (attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                String raw = restClient.post()
                        .uri(endpoint)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);

                Map<String, Object> parsed = objectMapper.readValue(raw,
                        new TypeReference<>() {});
                List<Map<String, Object>> candidates =
                        (List<Map<String, Object>>) parsed.get("candidates");
                Map<String, Object> content =
                        (Map<String, Object>) candidates.get(0).get("content");
                List<Map<String, Object>> parts =
                        (List<Map<String, Object>>) content.get("parts");
                responseJson = (String) parts.get(0).get("text");

                // Kiểm tra output hợp lệ JSON
                objectMapper.readTree(responseJson);

                // Trích xuất token usage từ usageMetadata
                Integer tokensUsed = null;
                if (parsed.containsKey("usageMetadata") && parsed.get("usageMetadata") instanceof Map<?, ?> usage) {
                    Object totalTokens = usage.get("totalTokenCount");
                    if (totalTokens instanceof Number num) {
                        tokensUsed = num.intValue();
                    }
                }

                status = attempt > 0 ? "retried" : "success";
                int latencyMs = (int) (System.currentTimeMillis() - startMs);
                saveLog(requestType, prompt, responseJson, status, (short) attempt, latencyMs, tokensUsed, queryId);
                return responseJson;

            } catch (Exception e) {
                log.warn("[GeminiClient] attempt {}/{} failed: {}", attempt + 1, maxRetries + 1, e.getMessage());
                if (attempt == maxRetries) {
                    status = "failed";
                    int latencyMs = (int) (System.currentTimeMillis() - startMs);
                    saveLog(requestType, prompt, null, status, (short) attempt, latencyMs, null, queryId);
                    throw new LlmCallException("LLM call failed after " + (maxRetries + 1) + " attempts", e);
                }
            }
        }

        int latencyMs = (int) (System.currentTimeMillis() - startMs);
        saveLog(requestType, prompt, responseJson, status, (short) attempt, latencyMs, null, queryId);
        return responseJson;
    }

    // ─── Prompt builders ──────────────────────────────────────────────────────

    private String buildExtractionPrompt(String queryText,
                                          String categoryCode,
                                          List<String> filterableAttributes) {
        return """
                Bạn là trợ lý phân tích yêu cầu mua sắm. Hãy trích xuất thông tin từ câu hỏi của người dùng.

                Ngành hàng: %s
                Các thuộc tính có thể lọc: %s

                Câu hỏi của người dùng: "%s"

                [VÍ DỤ]:
                - "Laptop sinh viên 15 triệu" → {"budgetMax": 15000000, "target": "student", "requiredSpecs": {}}
                - "Điện thoại chụp ảnh đẹp RAM 8GB dưới 10 triệu" → {"budgetMax": 10000000, "target": null, "requiredSpecs": {"ram": "8"}}
                - "Laptop gaming i7 RAM 16GB SSD 512" → {"budgetMax": null, "target": "gamer", "requiredSpecs": {"cpu": "i7", "ram": "16", "storage": "512"}}

                Trả về JSON theo schema đã quy định. Lưu ý:
                - budgetMax: ngân sách tối đa bằng VNĐ (null nếu không đề cập)
                - budgetMin: ngân sách tối thiểu bằng VNĐ (null nếu không đề cập)
                - target: đối tượng sử dụng (student/gamer/office/designer..., null nếu không rõ)
                - requiredSpecs: chỉ điền các thuộc tính được đề cập rõ ràng, bỏ qua phần còn lại
                - Khi người dùng nói "15 triệu" hoặc "15tr", hiểu là 15000000 VNĐ
                - Khi nói "dưới X" → budgetMax = X; "trên X" → budgetMin = X
                - Khi nói "tầm X" → budgetMin = X * 0.8, budgetMax = X * 1.2
                """.formatted(categoryCode, filterableAttributes, queryText);
    }

    private String buildSummarizationPrompt(String productName, List<String> reviewContents) {
        // Giới hạn 30 review × tối đa 300 ký tự/review để tối ưu context window và chi phí token
        String reviewsText = reviewContents.stream()
                .limit(30)
                .map(r -> r.length() > 300 ? r.substring(0, 300) + "..." : r)
                .collect(java.util.stream.Collectors.joining("\n---\n"));

        return """
                Bạn là trợ lý đánh giá sản phẩm công nghệ khách quan, trung thực.
                Hãy phân tích các đánh giá thực tế từ người dùng Việt Nam về sản phẩm "%s".

                [DANH SÁCH ĐÁNH GIÁ]:
                %s

                [YÊU CẦU ĐẦU RA]:
                Trả về JSON với đúng 3 trường sau — KHÔNG bịa đặt thông tin không có trong review:

                - summaryText: 2–3 câu tóm tắt tổng thể. Nêu rõ sản phẩm phù hợp với ai và có đáng mua không.

                - pros: Liệt kê các điểm được khen nhiều nhất.
                  Mỗi điểm viết trên một dòng, bắt đầu bằng "• ".
                  Ví dụ: "• Pin trâu, dùng được cả ngày\\n• Màn hình sắc nét, màu sắc chuẩn"

                - cons: Liệt kê các nhược điểm hoặc lỗi phổ biến.
                  Mỗi điểm viết trên một dòng, bắt đầu bằng "• ".
                  Nếu không tìm thấy nhược điểm đáng kể, ghi: "• Chưa ghi nhận phản hồi tiêu cực nổi bật."
                """.formatted(productName, reviewsText);
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private Map<String, Object> buildRequestBody(String prompt, Map<String, Object> schema) {
        return Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", Map.of(
                        "response_mime_type", "application/json",
                        "response_schema", schema
                )
        );
    }

    private void saveLog(String requestType, String prompt, String response,
                          String status, short retryCount, int latencyMs, Integer tokensUsed, Long queryId) {
        try {
            LlmRequestLog.LlmRequestLogBuilder builder = LlmRequestLog.builder()
                    .requestType(requestType)
                    .promptText(prompt)
                    .responseText(response)
                    .status(status)
                    .retryCount(retryCount)
                    .latencyMs(latencyMs)
                    .tokensUsed(tokensUsed);

            if (queryId != null) {
                builder.searchQuery(entityManager.getReference(com.shoppingagent.shared.entity.SearchQuery.class, queryId));
            }

            entityManager.persist(builder.build());
        } catch (Exception e) {
            // Log lỗi không được phép làm fail luồng chính
            GeminiClient.log.error("Failed to persist LLM log", e);
        }
    }
}

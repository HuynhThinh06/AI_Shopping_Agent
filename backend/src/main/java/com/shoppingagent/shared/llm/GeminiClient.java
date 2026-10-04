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
    // ─── Schema cho ExtractedCriteria ────────────────────────────────────────
    private static final Map<String, Object> CRITERIA_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "reasoning",      Map.of("type", "string", "description", "Step by step reasoning before extraction"),
                    "categoryCode",   Map.of("type", "string"),
                    "budgetMax",      Map.of("type", "number", "nullable", true),
                    "budgetMin",      Map.of("type", "number", "nullable", true),
                    "requiredSpecs",  Map.of("type", "object"),
                    "weightPrice",    Map.of("type", "number"),
                    "weightRating",   Map.of("type", "number"),
                    "weightSpec",     Map.of("type", "number")
            ),
            "required", List.of("reasoning", "categoryCode", "budgetMin", "budgetMax", "requiredSpecs", "weightPrice", "weightRating", "weightSpec")
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
        String json = callWithRetry(prompt, null, "extract_query", null);
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
        int totalTokenCount = 0;

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
                
                Map<String, Object> usageMetadata = (Map<String, Object>) parsed.get("usageMetadata");
                if (usageMetadata != null && usageMetadata.get("totalTokenCount") != null) {
                    totalTokenCount = ((Number) usageMetadata.get("totalTokenCount")).intValue();
                }

                List<Map<String, Object>> candidates =
                        (List<Map<String, Object>>) parsed.get("candidates");
                Map<String, Object> content =
                        (Map<String, Object>) candidates.get(0).get("content");
                List<Map<String, Object>> parts =
                        (List<Map<String, Object>>) content.get("parts");
                responseJson = (String) parts.get(0).get("text");

                // Kiểm tra output hợp lệ JSON
                objectMapper.readTree(responseJson);
                status = attempt > 0 ? "retried" : "success";
                break;

            } catch (Exception e) {
                log.warn("[GeminiClient] attempt {}/{} failed: {}", attempt + 1, maxRetries + 1, e.getMessage());
                if (attempt == maxRetries) {
                    status = "failed";
                    saveLog(requestType, prompt, null, status, (short) attempt,
                            (int)(System.currentTimeMillis() - startMs), totalTokenCount, queryId);
                    throw new LlmCallException("LLM call failed after " + (maxRetries + 1) + " attempts", e);
                }
                
                // Task A4: Exponential Backoff (1s, 2s, 4s...)
                try {
                    long waitTime = (long) Math.pow(2, attempt) * 1000;
                    Thread.sleep(waitTime);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        }

        int latencyMs = (int)(System.currentTimeMillis() - startMs);
        saveLog(requestType, prompt, responseJson, status, (short) attempt, latencyMs, totalTokenCount, queryId);
        return responseJson;
    }

    // ─── Prompt builders ──────────────────────────────────────────────────────

        public String callWithCustomSchema(String prompt, Map<String, Object> schema) {
        return callWithRetry(prompt, schema, "RERANK", null);
    }

    private String buildExtractionPrompt(String queryText,
                                         String categoryCode,
                                         List<String> filterableAttributes) {
        return """
                Bạn là trợ lý phân tích yêu cầu mua sắm. Bạn hãy SUY LUẬN TỪNG BƯỚC (Chain-of-Thought) để hiểu sâu nhu cầu người dùng.

                Ngành hàng: %s
                Các thuộc tính có thể lọc: %s

                QUY TẮC TIẾNG LÓNG & KỸ THUẬT:
                - Tiền tệ: "củ" = "chai" = "tr" = 1.000.000 VNĐ.
                - Nhu cầu "lập trình", "code", "IT": bắt buộc phải ép RAM >= 16GB, CPU phải từ Core i5 hoặc Ryzen 5 trở lên.
                - Nhu cầu "chơi game", "đồ họa": ép phải có Card rời (VGA), RAM >= 16GB.
                - Nhu cầu "văn phòng", "mang đi cafe": ép trọng lượng (weight) <= 1.5kg.
                - Nhu cầu "pin trâu": ép battery >= 60Wh (laptop) hoặc >= 5000mAh (điện thoại).

                QUY TẮC PHÂN BỔ TRỌNG SỐ (WEIGHTS) TỔNG 1.0:
                - Nếu khách nhấn mạnh "rẻ", "giá rẻ", "ngân sách hẹp": weightPrice=0.7, weightRating=0.1, weightSpec=0.2
                - Nếu khách nhấn mạnh "chơi game ngon", "cấu hình khủng", "tiền không thành vấn đề": weightPrice=0.1, weightRating=0.2, weightSpec=0.7
                - Nếu khách ưu tiên "bền", "uy tín", "đánh giá tốt": weightPrice=0.2, weightRating=0.6, weightSpec=0.2
                - Mặc định: weightPrice=0.35, weightRating=0.20, weightSpec=0.45

                VÍ DỤ MẪU:
                Input: "lap 15 củ học IT" -> Output: {"categoryCode": "LAPTOP", "budgetMax": 15000000, "requiredSpecs": {"ram": ">=16", "use_case": "IT"}, "weightPrice": 0.4, "weightRating": 0.2, "weightSpec": 0.4}
                Input: "điện thoại tầm trung chơi game mượt" -> Output: {"categoryCode": "PHONE", "requiredSpecs": {"use_case": "game"}, "weightPrice": 0.2, "weightRating": 0.2, "weightSpec": 0.6}
                
                CÂU HỎI THỰC TẾ: "%s"

                Hãy phân tích kỹ, tự động bổ sung các spec ngầm định (ví dụ IT thì phải thêm RAM>=16) và trả về định dạng JSON thuần túy tuân thủ chặt chẽ response_schema.
                """.formatted(categoryCode, filterableAttributes, queryText);
    }

    private String buildSummarizationPrompt(String productName, List<String> reviewContents) {
        String reviewsText = String.join("\n---\n", reviewContents);
        return """
                Bạn là chuyên gia phân tích sản phẩm. Hãy tóm tắt các đánh giá sau đây về sản phẩm "%s".

                Các đánh giá:
                %s

                Trả về JSON theo schema đã quy định:
                - summaryText: đoạn tóm tắt tổng quan ngắn gọn (2-3 câu)
                - pros: liệt kê ưu điểm nổi bật (bullet points, mỗi điểm cách nhau bởi \\n)
                - cons: liệt kê nhược điểm (bullet points, mỗi điểm cách nhau bởi \\n)
                """.formatted(productName, reviewsText);
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private Map<String, Object> buildRequestBody(String prompt, Map<String, Object> schema) {
        Map<String, Object> config = new java.util.HashMap<>();
        config.put("response_mime_type", "application/json");
        if (schema != null) {
            config.put("response_schema", schema);
        }
        return Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", config
        );
    }

    private void saveLog(String requestType, String prompt, String response,
                          String status, short retryCount, int latencyMs, int totalTokenCount, Long queryId) {
        try {
            LlmRequestLog log = LlmRequestLog.builder()
                    .requestType(requestType)
                    .promptText(prompt)
                    .responseText(response)
                    .status(status)
                    .retryCount(retryCount)
                    .latencyMs(latencyMs)
                    .tokensUsed(totalTokenCount)
                    .build();
            entityManager.persist(log);
        } catch (Exception e) {
            // Log lỗi không được phép làm fail luồng chính
            GeminiClient.log.error("Failed to persist LLM log", e);
        }
    }
}

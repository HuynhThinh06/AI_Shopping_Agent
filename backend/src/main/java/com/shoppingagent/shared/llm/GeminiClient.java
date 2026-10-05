package com.shoppingagent.shared.llm;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shoppingagent.review.dto.SummaryDTO;
import com.shoppingagent.search.dto.ExtractedCriteria;
import com.shoppingagent.shared.entity.LlmRequestLog;
import com.shoppingagent.shared.entity.SearchQuery;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Triển khai LlmClient dùng Google Gemini REST API.
 * Sử dụng Structured Output (responseSchema) để đảm bảo JSON output đúng format.
 * Có cơ chế retry tối đa {@code maxRetries} lần, exponential backoff và ghi log mỗi lần gọi.
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
                    Map.entry("reasoning",      Map.of("type", "string", "description", "Step by step reasoning before extraction")),
                    Map.entry("categoryCode",   Map.of("type", "string")),
                    Map.entry("budgetMax",      Map.of("type", "number", "nullable", true)),
                    Map.entry("budgetMin",      Map.of("type", "number", "nullable", true)),
                    Map.entry("target",         Map.of("type", "string", "nullable", true)),
                    Map.entry("requiredSpecs",  Map.of("type", "object")),
                    Map.entry("weightPrice",    Map.of("type", "number")),
                    Map.entry("weightRating",   Map.of("type", "number")),
                    Map.entry("weightSpec",     Map.of("type", "number"))
            ),
            "required", List.of("reasoning", "categoryCode", "requiredSpecs", "weightPrice", "weightRating", "weightSpec")
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
                
                // Strip markdown code blocks if AI wrapped it
                if (responseJson != null) {
                    responseJson = responseJson.trim();
                    if (responseJson.startsWith("`json")) {
                        responseJson = responseJson.substring(7);
                    } else if (responseJson.startsWith("`")) {
                        responseJson = responseJson.substring(3);
                    }
                    if (responseJson.endsWith("`")) {
                        responseJson = responseJson.substring(0, responseJson.length() - 3);
                    }
                    responseJson = responseJson.trim();
                }

                // Kiểm tra output hợp lệ JSON
                objectMapper.readTree(responseJson);

                status = attempt > 0 ? "retried" : "success";
                int latencyMs = (int) (System.currentTimeMillis() - startMs);
                saveLog(requestType, prompt, responseJson, status, (short) attempt, latencyMs, totalTokenCount, queryId);
                return responseJson;

            } catch (Exception e) {
                log.warn("[GeminiClient] attempt {}/{} failed: {}", attempt + 1, maxRetries + 1, e.getMessage());
                if (attempt == maxRetries) {
                    status = "failed";
                    int latencyMs = (int) (System.currentTimeMillis() - startMs);
                    saveLog(requestType, prompt, null, status, (short) attempt, latencyMs, totalTokenCount, queryId);
                    throw new LlmCallException("LLM call failed after " + (maxRetries + 1) + " attempts", e);
                }

                // Task A4: Exponential Backoff (1s, 2s, 4s...)
                try {
                    long waitTime = (long) Math.pow(2, attempt) * 1000L;
                    Thread.sleep(waitTime);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        }

        int latencyMs = (int) (System.currentTimeMillis() - startMs);
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
                Bạn là trợ lý phân tích yêu cầu mua sắm. Bạn hãy SUY LUẬN TỪNG BƯỚC (Chain-of-Thought) để hiểu sâu nhu cầu và trích xuất thông tin.

                Ngành hàng: %s
                Các thuộc tính có thể lọc: %s

                QUY TẮC TIẾNG LÓNG & KỸ THUẬT:
                - Tiền tệ: "củ" = "chai" = "tr" = 1.000.000 VNĐ.
                - Nhu cầu "lập trình", "code", "IT": bắt buộc phải ép RAM >= 16GB, CPU phải từ Core i5 hoặc Ryzen 5 trở lên.
                - Nhu cầu "chơi game", "đồ họa": ép phải có Card rời (VGA), RAM >= 16GB.
                - Nhu cầu "văn phòng", "mang đi cafe": ép trọng lượng (weight) <= 1.5kg.
                - Nhu cầu "pin trâu": ép battery >= 60Wh (laptop) hoặc >= 5000mAh (điện thoại).

                QUY TẮC PHÂN BỔ TRỌNG SỐ (WEIGHTS) TỔNG 1.0:
                - Nhấn mạnh "rẻ", "giá rẻ": weightPrice=0.7, weightRating=0.1, weightSpec=0.2
                - Nhấn mạnh "cấu hình khủng", "không thành vấn đề": weightPrice=0.1, weightRating=0.2, weightSpec=0.7
                - Nhấn mạnh "bền", "uy tín": weightPrice=0.2, weightRating=0.6, weightSpec=0.2
                - Mặc định: weightPrice=0.35, weightRating=0.20, weightSpec=0.45

                VÍ DỤ MẪU (FEW-SHOTS):
                - "Laptop sinh viên 15 củ" -> {"categoryCode": "laptop", "budgetMax": 15000000, "target": "student", "requiredSpecs": {}, "weightPrice": 0.4, "weightRating": 0.2, "weightSpec": 0.4}
                - "lap 15 củ học IT" -> {"categoryCode": "laptop", "budgetMax": 15000000, "target": "student", "requiredSpecs": {"ram": "16"}, "weightPrice": 0.4, "weightRating": 0.2, "weightSpec": 0.4}
                - "đt pin trâu dưới 10 chai" -> {"categoryCode": "phone", "budgetMax": 10000000, "target": null, "requiredSpecs": {"battery": "5000"}, "weightPrice": 0.4, "weightRating": 0.2, "weightSpec": 0.4}

                CÂU HỎI THỰC TẾ: "%s"

                Hãy phân tích kỹ và trả về định dạng JSON thuần túy.
                - budgetMax: ngân sách tối đa bằng VNĐ (null nếu không đề cập).
                - budgetMin: ngân sách tối thiểu bằng VNĐ (null nếu không đề cập).
                - target: đối tượng sử dụng (student/gamer/office/designer..., null nếu không rõ).
                - requiredSpecs: điền các thuộc tính được đề cập, bổ sung spec ngầm định (IT->RAM>=16).
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
            LlmRequestLog.LlmRequestLogBuilder builder = LlmRequestLog.builder()
                    .requestType(requestType)
                    .promptText(prompt)
                    .responseText(response)
                    .status(status)
                    .retryCount(retryCount)
                    .latencyMs(latencyMs)
                    .tokensUsed(totalTokenCount > 0 ? totalTokenCount : null);

            if (queryId != null) {
                builder.searchQuery(entityManager.getReference(SearchQuery.class, queryId));
            }

            entityManager.persist(builder.build());
        } catch (Exception e) {
            // Log lỗi không được phép làm fail luồng chính
            GeminiClient.log.error("Failed to persist LLM log", e);
        }
    }
}

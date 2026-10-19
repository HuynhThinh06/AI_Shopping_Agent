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

    @Value("${llm.gemini.model:gemini-3.5-flash-lite}")
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
                Bạn là Chuyên gia Tư vấn Công nghệ kiêm Kỹ sư Phân tích Yêu cầu Mua sắm (E-commerce Intent Extraction Specialist).
                Nhiệm vụ của bạn là áp dụng SUY LUẬN TỪNG BƯỚC (Chain-of-Thought) để hiểu cả yêu cầu tường minh (explicit) lẫn ngụ ý ngầm định (implicit) của khách hàng.

                [THÔNG TIN HỆ THỐNG]:
                - Ngành hàng hiện tại: %s
                - DANH SÁCH THUỘC TÍNH ĐƯỢC PHÉP DÙNG TRONG requiredSpecs: %s
                (CHỈ ĐƯỢC DÙNG các key nằm trong danh sách này để đảm bảo query database, KHÔNG tự bịa key khác).

                [QUY TẮC RÀNG BUỘC KIỂU DỮ LIỆU ĐẶC BIỆT]:
                - Các thuộc tính đo lường vật lý: ram, storage, battery, weight, screen_size, refresh_rate BẮT BUỘC PHẢI LÀ GIÁ TRỊ SỐ (ví dụ: "16", "512", "60", "1.5", "90", "120").
                - TUYỆT ĐỐI KHÔNG gán tính từ cảm quan (như "đẹp", "khủng", "trâu", "nhẹ", "mạnh", "xịn") vào các trường số này.
                  Ví dụ SAI: {"screen_size": "đẹp"}, {"battery": "trâu"}.
                  Ví dụ ĐÚNG: Khi khách nói "màn hình đẹp" -> target="designer", requiredSpecs={"refresh_rate": ">=90"} (hoặc để trống requiredSpecs và gán weightSpec=0.6).

                [BẢNG QUY TẮC SUY LUẬN NGỮ CẢNH & TIẾNG LÓNG]:
                1. TIỀN TỆ:
                   - "củ" = "chai" = "tr" = "triệu" = "lít" = 1.000.000 VNĐ. Ví dụ: "15 củ" -> 15.000.000 VNĐ.
                2. MÀN HÌNH & THỊ GIÁC:
                   - "màn hình đẹp", "màn nét", "màn sắc nét", "chuẩn màu", "xem phim":
                     + target: "designer"
                     + requiredSpecs: {"refresh_rate": ">=90"} (nếu laptop/phone)
                     + Trọng số: weightSpec=0.6, weightPrice=0.2, weightRating=0.2
                3. ĐỘNG LỰC HỌC TẬP & NGHỀ NGHIỆP:
                   - "lập trình", "code", "IT", "developer":
                     + target: "developer"
                     + requiredSpecs: {"ram": ">=16"}
                   - "học đồ họa", "thiết kế", "dựng phim", "render", "3D":
                     + target: "designer"
                     + requiredSpecs: {"ram": ">=16"}
                   - "văn phòng", "mỏng nhẹ", "cafe", "di chuyển":
                     + target: "office"
                     + requiredSpecs: {"weight": "<=1.5"}
                   - "sinh viên", "học sinh", "tiết kiệm":
                     + target: "student"
                     + Trọng số: weightPrice=0.5, weightSpec=0.3, weightRating=0.2
                4. HIỆU NĂNG & PIN:
                   - "pin trâu", "pin khỏe", "dùng cả ngày":
                     + requiredSpecs: {"battery": ">=60"} (laptop) hoặc {"battery": ">=5000"} (phone)
                   - "chơi game", "chiến game", "gaming":
                     + target: "gamer"
                     + requiredSpecs: {"refresh_rate": ">=120", "ram": ">=16"}

                [QUY TẮC PHÂN BỔ TRỌNG SỐ (WEIGHTS) TỔNG 1.0]:
                - Nhấn mạnh "rẻ", "giá mềm", "tiết kiệm": weightPrice=0.65, weightRating=0.15, weightSpec=0.20
                - Nhấn mạnh "cấu hình", "màn đẹp", "mạnh", "không thành vấn đề": weightPrice=0.15, weightRating=0.20, weightSpec=0.65
                - Nhấn mạnh "bền", "uy tín", "review tốt", "đánh giá cao": weightPrice=0.20, weightRating=0.60, weightSpec=0.20
                - Mặc định: weightPrice=0.35, weightRating=0.20, weightSpec=0.45

                [VÍ DỤ MẪU (FEW-SHOTS)]:
                - "Tìm laptop màn hình đẹp" -> {"categoryCode": "laptop", "budgetMin": null, "budgetMax": null, "target": "designer", "requiredSpecs": {"refresh_rate": ">=90"}, "weightPrice": 0.2, "weightRating": 0.2, "weightSpec": 0.6}
                - "Laptop sinh viên 15 củ" -> {"categoryCode": "laptop", "budgetMin": null, "budgetMax": 15000000, "target": "student", "requiredSpecs": {}, "weightPrice": 0.5, "weightRating": 0.2, "weightSpec": 0.3}
                - "lap 15 củ học IT" -> {"categoryCode": "laptop", "budgetMin": null, "budgetMax": 15000000, "target": "developer", "requiredSpecs": {"ram": ">=16"}, "weightPrice": 0.4, "weightRating": 0.2, "weightSpec": 0.4}
                - "đt pin trâu dưới 10 chai" -> {"categoryCode": "phone", "budgetMin": null, "budgetMax": 10000000, "target": null, "requiredSpecs": {"battery": ">=5000"}, "weightPrice": 0.4, "weightRating": 0.2, "weightSpec": 0.4}

                [CÂU HỎI THỰC TẾ]:
                "%s"

                Hãy trả về duy nhất định dạng JSON thuần túy theo schema.
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

    private static final ThreadLocal<List<LlmRequestLog>> PENDING_QUERY_LOGS =
            ThreadLocal.withInitial(java.util.ArrayList::new);

    public void clearPendingLogs() {
        PENDING_QUERY_LOGS.get().clear();
    }

    public void bindLogsToSearchQuery(SearchQuery searchQuery) {
        if (searchQuery == null || searchQuery.getId() == null) return;
        try {
            List<LlmRequestLog> logs = PENDING_QUERY_LOGS.get();
            for (LlmRequestLog logItem : logs) {
                logItem.setSearchQuery(searchQuery);
                entityManager.merge(logItem);
            }
        } catch (Exception e) {
            GeminiClient.log.warn("Could not bind LLM logs to SearchQuery #{}", searchQuery.getId(), e);
        } finally {
            PENDING_QUERY_LOGS.remove();
        }
    }

    private void saveLog(String requestType, String prompt, String response,
                          String status, short retryCount, int latencyMs, int totalTokenCount, Long queryId) {
        try {
            int resolvedTokens = totalTokenCount;
            if (resolvedTokens <= 0 && prompt != null) {
                int charLen = prompt.length() + (response != null ? response.length() : 0);
                resolvedTokens = Math.max(1, charLen / 4);
            }

            LlmRequestLog.LlmRequestLogBuilder builder = LlmRequestLog.builder()
                    .requestType(requestType)
                    .promptText(prompt)
                    .responseText(response)
                    .status(status)
                    .retryCount(retryCount)
                    .latencyMs(latencyMs)
                    .tokensUsed(resolvedTokens > 0 ? resolvedTokens : null);

            if (queryId != null) {
                builder.searchQuery(entityManager.getReference(SearchQuery.class, queryId));
            }

            LlmRequestLog savedLog = builder.build();
            entityManager.persist(savedLog);
            PENDING_QUERY_LOGS.get().add(savedLog);
        } catch (Exception e) {
            // Log lỗi không được phép làm fail luồng chính
            GeminiClient.log.error("Failed to persist LLM log", e);
        }
    }
}

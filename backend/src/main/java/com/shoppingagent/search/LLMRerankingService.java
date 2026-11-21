package com.shoppingagent.search;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shoppingagent.search.dto.RankedProduct;
import com.shoppingagent.shared.llm.GeminiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LLMRerankingService {

    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;

    @SuppressWarnings("unchecked")
    public List<RankedProduct> rerank(String originalQuery, List<RankedProduct> topCandidates, int finalTopK) {
        if (topCandidates == null || topCandidates.isEmpty()) {
            return List.of();
        }
        if (topCandidates.size() <= 1) {
            return topCandidates;
        }

        // Limit the candidates to send to LLM to max 30 to save tokens and context
        List<RankedProduct> candidatesToSend = topCandidates.stream().limit(15).collect(Collectors.toList());

        // Construct the prompt with candidates info
        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("You are an expert sales consultant. The user is looking for a product with the following query:\n");
        promptBuilder.append("\"").append(originalQuery).append("\"\n\n");
        promptBuilder.append("Here are the top candidates returned by the database search. Please analyze them and re-rank them to find the absolute best matches for the user's implicit and explicit needs.\n\n");
        promptBuilder.append("Candidates:\n");
        
        for (RankedProduct rp : candidatesToSend) {
            promptBuilder.append("- ID: ").append(rp.getProductId())
                         .append(", Name: ").append(rp.getName())
                         .append(", Price: ").append(rp.getPrice())
                         .append(", Rating: ").append(rp.getAvgRating())
                         .append(", Specs: ").append(rp.getSpecs())
                         .append("\n");
        }
        
        promptBuilder.append("\nConsider requirements like 'không phải Acer' (brand must not be Acer), 'dân văn phòng' (lightweight), 'sinh viên' (budget-friendly), 'lập trình' (RAM>=16). ")
                     .append("Return a JSON object containing:\n")
                     .append("1. 'reasoning': a concise Vietnamese summary explaining your overall ranking logic.\n")
                     .append("2. 'rankedProductIds': a strictly ordered array of the best product IDs (best first).\n")
                     .append("3. 'productReasons': an array of objects {productId, reason} where each 'reason' is 1 short, concrete Vietnamese sentence explaining why that product matches the query.");

        Map<String, Object> productReasonItemSchema = Map.of(
            "type", "object",
            "properties", Map.of(
                "productId", Map.of("type", "integer"),
                "reason", Map.of("type", "string", "description", "1 câu tiếng Việt ngắn gọn giải thích mức độ phù hợp của sản phẩm")
            ),
            "required", List.of("productId", "reason")
        );

        Map<String, Object> schema = Map.of(
            "type", "object",
            "properties", Map.of(
                "reasoning", Map.of("type", "string", "description", "Tóm tắt ngắn gọn bằng tiếng Việt về tiêu chí tái xếp hạng tổng thể"),
                "rankedProductIds", Map.of(
                    "type", "array",
                    "items", Map.of("type", "integer")
                ),
                "productReasons", Map.of(
                    "type", "array",
                    "items", productReasonItemSchema
                )
            ),
            "required", List.of("reasoning", "rankedProductIds")
        );

        try {
            // We use GeminiClient.generateContent directly or create a specific method.
            // Since GeminiClient doesn't expose a generic method with schema directly, we might need to add one,
            // OR we can just use prompt with markdown JSON and parse it.
            // Wait, GeminiClient currently doesn't expose a generic JSON method. Let's add one to GeminiClient.
            String rawJson = geminiClient.callWithCustomSchema(promptBuilder.toString(), schema);
            
            // Parse response - using Number to safely avoid ClassCastException
            Map<String, Object> result = objectMapper.readValue(rawJson, new TypeReference<>() {});
            String overallReasoning = result.get("reasoning") instanceof String s && !s.isBlank()
                    ? s.trim()
                    : null;

            Map<Long, String> reasonByProductId = new HashMap<>();
            Object productReasonsObj = result.get("productReasons");
            if (productReasonsObj instanceof List<?> reasonList) {
                for (Object itemObj : reasonList) {
                    if (itemObj instanceof Map<?, ?> itemMap) {
                        Object pidObj = itemMap.get("productId");
                        Object reasonObj = itemMap.get("reason");
                        if (pidObj instanceof Number pidNum && reasonObj instanceof String rStr && !rStr.isBlank()) {
                            reasonByProductId.put(pidNum.longValue(), rStr.trim());
                        }
                    }
                }
            }

            List<Number> rankedIdsRaw = (List<Number>) result.get("rankedProductIds");
            List<Long> rankedIds = rankedIdsRaw == null ? null : rankedIdsRaw.stream().map(Number::longValue).collect(Collectors.toList());

            if (rankedIds == null || rankedIds.isEmpty()) {
                return candidatesToSend.stream().limit(finalTopK).collect(Collectors.toList());
            }

            // Re-order the candidates based on the LLM's ranked IDs
            List<RankedProduct> finalRanked = new ArrayList<>();
            for (Long id : rankedIds) {
                candidatesToSend.stream()
                        .filter(p -> p.getProductId().equals(id))
                        .findFirst()
                        .filter(p -> !finalRanked.contains(p))
                        .ifPresent(finalRanked::add);
                if (finalRanked.size() == finalTopK) break;
            }

            // Fill up with remaining if LLM didn't return enough
            for (RankedProduct rp : candidatesToSend) {
                if (finalRanked.size() >= finalTopK) break;
                if (!finalRanked.contains(rp)) {
                    finalRanked.add(rp);
                }
            }
            
            // Re-assign rankPosition (1 -> N) và lưu lý do giải thích từ LLM Reranking
            for (int i = 0; i < finalRanked.size(); i++) {
                RankedProduct rp = finalRanked.get(i);
                rp.setRankPosition(i + 1);
                String reason = reasonByProductId.getOrDefault(rp.getProductId(), overallReasoning);
                if (reason != null && !reason.isBlank()) {
                    rp.setReasoning(reason);
                }
            }

            return finalRanked;
            
        } catch (Exception e) {
            log.error("[LLMReranking] Failed to re-rank. Falling back to default ranking. Error: {}", e.getMessage());
            return candidatesToSend.stream().limit(finalTopK).collect(Collectors.toList());
        }
    }
}

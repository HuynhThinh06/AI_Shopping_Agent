package com.shoppingagent.search;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shoppingagent.search.dto.RankedProduct;
import com.shoppingagent.shared.llm.GeminiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LLMRerankingService {

    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;

    public List<RankedProduct> rerank(String originalQuery, List<RankedProduct> topCandidates, int finalTopK) {
        if (topCandidates == null || topCandidates.isEmpty()) {
            return List.of();
        }
        if (topCandidates.size() <= 1) {
            return topCandidates;
        }

        // Limit the candidates to send to LLM to max 30 to save tokens and context
        List<RankedProduct> candidatesToSend = topCandidates.stream().limit(30).collect(Collectors.toList());

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
        
        promptBuilder.append("\nConsider requirements like 'không phải Acer' (brand must not be Acer), 'dân văn phòng' (lightweight), 'sinh viên' (budget-friendly), 'lập trình' (RAM>=16). Return a JSON object containing a strictly ordered array of the best product IDs (best first).");

        Map<String, Object> schema = Map.of(
            "type", "object",
            "properties", Map.of(
                "reasoning", Map.of("type", "string", "description", "Step by step analysis of the candidates against the user query before ranking"),
                "rankedProductIds", Map.of(
                    "type", "array",
                    "items", Map.of("type", "integer")
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
            
            // Parse response
            Map<String, Object> result = objectMapper.readValue(rawJson, new TypeReference<>() {});
            List<Integer> rankedIdsInt = (List<Integer>) result.get("rankedProductIds");
            List<Long> rankedIds = rankedIdsInt == null ? null : rankedIdsInt.stream().map(Integer::longValue).collect(Collectors.toList());

            if (rankedIds == null || rankedIds.isEmpty()) {
                return candidatesToSend.stream().limit(finalTopK).collect(Collectors.toList());
            }

            // Re-order the candidates based on the LLM's ranked IDs
            List<RankedProduct> finalRanked = new ArrayList<>();
            for (Long id : rankedIds) {
                candidatesToSend.stream()
                        .filter(p -> p.getProductId().equals(id))
                        .findFirst()
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

            return finalRanked;
            
        } catch (Exception e) {
            log.error("[LLMReranking] Failed to re-rank. Falling back to default ranking. Error: {}", e.getMessage());
            return candidatesToSend.stream().limit(finalTopK).collect(Collectors.toList());
        }
    }
}

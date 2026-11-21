package com.shoppingagent.search;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shoppingagent.search.dto.RankedProduct;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.SearchQuery;
import com.shoppingagent.shared.entity.SearchResult;
import com.shoppingagent.shared.llm.GeminiClient;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LLMRerankingService & SearchResultRepository — Kiểm thử tái xếp hạng và lưu reasoning")
class LLMRerankingServiceTest {

    @Mock
    private GeminiClient geminiClient;

    @Mock
    private EntityManager entityManager;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("rerank — Sắp xếp theo rankedProductIds, gán rankPosition 1..N và lưu productReasons/fallback reasoning")
    void shouldReorderCandidatesAndPopulateReasoning() {
        LLMRerankingService service = new LLMRerankingService(geminiClient, objectMapper);

        RankedProduct acer = RankedProduct.builder()
                .productId(1L).name("Acer Aspire 5").brand("Acer").price(15_000_000L)
                .avgRating(BigDecimal.valueOf(4.5)).score(0.85).rankPosition(1).specs(Map.of("ram", 16)).build();
        RankedProduct asus = RankedProduct.builder()
                .productId(2L).name("Asus Vivobook 15").brand("Asus").price(16_500_000L)
                .avgRating(BigDecimal.valueOf(4.6)).score(0.82).rankPosition(2).specs(Map.of("ram", 16)).build();
        RankedProduct lenovo = RankedProduct.builder()
                .productId(3L).name("Lenovo IdeaPad Slim 3").brand("Lenovo").price(17_900_000L)
                .avgRating(BigDecimal.valueOf(4.7)).score(0.80).rankPosition(3).specs(Map.of("ram", 16)).build();

        String llmResponse = """
                {
                  "reasoning": "Đã loại trừ hãng Acer theo đúng yêu cầu phủ định của người dùng.",
                  "rankedProductIds": [3, 2],
                  "productReasons": [
                    {"productId": 3, "reason": "Lenovo IdeaPad đạt 4.7 sao, RAM 16GB và không thuộc hãng Acer."}
                  ]
                }
                """;
        when(geminiClient.callWithCustomSchema(anyString(), anyMap())).thenReturn(llmResponse);

        List<RankedProduct> result = service.rerank(
                "Laptop không phải Acer dưới 20 triệu",
                List.of(acer, asus, lenovo),
                2
        );

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getProductId()).isEqualTo(3L);
        assertThat(result.get(0).getRankPosition()).isEqualTo(1);
        assertThat(result.get(0).getReasoning()).isEqualTo("Lenovo IdeaPad đạt 4.7 sao, RAM 16GB và không thuộc hãng Acer.");

        // Product 2 không có trong productReasons nên dùng fallback overall reasoning
        assertThat(result.get(1).getProductId()).isEqualTo(2L);
        assertThat(result.get(1).getRankPosition()).isEqualTo(2);
        assertThat(result.get(1).getReasoning()).isEqualTo("Đã loại trừ hãng Acer theo đúng yêu cầu phủ định của người dùng.");
    }

    @Test
    @DisplayName("SearchResultRepository.saveAll — Lưu đầy đủ trường reasoning xuống SearchResult")
    void shouldPersistReasoningInSearchResult() {
        SearchResultRepository repo = new SearchResultRepository(entityManager);

        SearchQuery queryRef = SearchQuery.builder().id(10L).queryText("Laptop không phải Acer").build();
        Product productRef = Product.builder().id(3L).name("Lenovo IdeaPad Slim 3").price(17_900_000L).build();
        when(entityManager.getReference(SearchQuery.class, 10L)).thenReturn(queryRef);
        when(entityManager.getReference(Product.class, 3L)).thenReturn(productRef);

        RankedProduct rp = RankedProduct.builder()
                .productId(3L)
                .rankPosition(1)
                .score(0.9123)
                .reasoning("Phù hợp điều kiện loại trừ Acer và RAM 16GB")
                .build();

        repo.saveAll(List.of(rp), 10L);

        ArgumentCaptor<SearchResult> captor = ArgumentCaptor.forClass(SearchResult.class);
        verify(entityManager, times(1)).persist(captor.capture());
        SearchResult persisted = captor.getValue();
        assertThat(persisted.getRankPosition()).isEqualTo(1);
        assertThat(persisted.getScore()).isEqualTo(0.9123);
        assertThat(persisted.getReasoning()).isEqualTo("Phù hợp điều kiện loại trừ Acer và RAM 16GB");
    }
}

package com.shoppingagent.search;

import com.shoppingagent.search.dto.RankedProduct;
import com.shoppingagent.shared.entity.SearchQuery;
import com.shoppingagent.shared.entity.SearchResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class SearchResultRepository {

    private final EntityManager entityManager;

    public void saveAll(List<RankedProduct> ranked, Long queryId) {
        SearchQuery queryRef = entityManager.getReference(SearchQuery.class, queryId);
        ranked.forEach(rp -> {
            SearchResult result = SearchResult.builder()
                    .searchQuery(queryRef)
                    .product(com.shoppingagent.shared.entity.Product.builder().id(rp.getProductId()).build())
                    .rankPosition(rp.getRankPosition())
                    .score(rp.getScore())
                    .build();
            entityManager.persist(result);
        });
    }
}

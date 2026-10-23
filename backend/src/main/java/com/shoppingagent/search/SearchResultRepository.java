package com.shoppingagent.search;

import com.shoppingagent.search.dto.RankedProduct;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.SearchQuery;
import com.shoppingagent.shared.entity.SearchResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class SearchResultRepository {

    private final EntityManager entityManager;

    @Transactional
    public void saveAll(List<RankedProduct> ranked, Long queryId) {
        if (ranked == null || ranked.isEmpty() || queryId == null) return;
        SearchQuery queryRef = entityManager.getReference(SearchQuery.class, queryId);
        for (RankedProduct rp : ranked) {
            SearchResult result = SearchResult.builder()
                    .searchQuery(queryRef)
                    .product(entityManager.getReference(Product.class, rp.getProductId()))
                    .rankPosition(rp.getRankPosition())
                    .score(rp.getScore())
                    .build();
            entityManager.persist(result);
        }
    }
}

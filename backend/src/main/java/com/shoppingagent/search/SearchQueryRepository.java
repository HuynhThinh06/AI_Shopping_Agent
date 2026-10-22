package com.shoppingagent.search;

import com.shoppingagent.shared.entity.SearchQuery;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchQueryRepository extends JpaRepository<SearchQuery, Long> {
    @EntityGraph(attributePaths = {"categoryDetected"})
    List<SearchQuery> findTop10ByOrderByCreatedAtDesc();
}

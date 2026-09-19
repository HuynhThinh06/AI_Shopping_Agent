package com.shoppingagent.search;

import com.shoppingagent.shared.entity.SearchQuery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SearchQueryRepository extends JpaRepository<SearchQuery, Long> {
}

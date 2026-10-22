package com.shoppingagent.search;

import com.shoppingagent.shared.entity.SearchQuery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchQueryRepository extends JpaRepository<SearchQuery, Long> {
    List<SearchQuery> findTop10ByOrderByCreatedAtDesc();

    List<SearchQuery> findTop20ByUserIdOrderByCreatedAtDesc(Integer userId);

    @org.springframework.data.jpa.repository.Query("SELECT sq FROM SearchQuery sq WHERE LOWER(sq.user.email) = LOWER(:email) ORDER BY sq.createdAt DESC")
    List<SearchQuery> findTop20ByUserEmailOrderByCreatedAtDesc(@org.springframework.data.repository.query.Param("email") String email);

    List<SearchQuery> findTop20BySessionIdOrderByCreatedAtDesc(String sessionId);
}

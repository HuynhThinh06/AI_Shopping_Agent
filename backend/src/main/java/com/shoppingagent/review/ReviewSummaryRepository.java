package com.shoppingagent.review;

import com.shoppingagent.shared.entity.ReviewSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewSummaryRepository extends JpaRepository<ReviewSummary, Long> {
}

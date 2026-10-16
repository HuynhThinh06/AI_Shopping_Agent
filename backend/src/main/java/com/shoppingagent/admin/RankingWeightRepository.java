package com.shoppingagent.admin;

import com.shoppingagent.shared.entity.RankingWeight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RankingWeightRepository extends JpaRepository<RankingWeight, Integer> {

    @Query("SELECT rw FROM RankingWeight rw JOIN FETCH rw.category c WHERE LOWER(c.code) = LOWER(:categoryCode)")
    List<RankingWeight> findByCategoryCode(@Param("categoryCode") String categoryCode);

    @Query("SELECT rw FROM RankingWeight rw JOIN rw.category c WHERE LOWER(c.code) = LOWER(:categoryCode) AND rw.criteria = :criteria")
    Optional<RankingWeight> findByCategoryCodeAndCriteria(@Param("categoryCode") String categoryCode, @Param("criteria") String criteria);
}

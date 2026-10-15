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

    @Query("SELECT rw FROM RankingWeight rw JOIN rw.category c WHERE LOWER(c.code) = LOWER(:code)")
    List<RankingWeight> findByCategoryCode(@Param("code") String code);

    @Query("SELECT rw FROM RankingWeight rw JOIN rw.category c WHERE LOWER(c.code) = LOWER(:code) AND LOWER(rw.criteria) = LOWER(:criteria)")
    Optional<RankingWeight> findByCategoryCodeAndCriteria(@Param("code") String code, @Param("criteria") String criteria);
}

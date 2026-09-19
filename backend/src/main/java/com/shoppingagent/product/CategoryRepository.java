package com.shoppingagent.product;

import com.shoppingagent.shared.entity.Category;
import com.shoppingagent.shared.entity.CategoryAttribute;
import com.shoppingagent.shared.entity.RankingWeight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {

    Optional<Category> findByCode(String code);

    /** Lấy danh sách attribute filterable của một ngành hàng */
    @Query("""
            SELECT ca FROM CategoryAttribute ca
            JOIN ca.category c
            WHERE c.code = :code AND ca.isFilterable = TRUE
            ORDER BY ca.displayOrder
            """)
    List<CategoryAttribute> findByCategoryCodeAndFilterable(@Param("code") String code);

    /** Lấy trọng số xếp hạng theo ngành hàng dưới dạng Map */
    @Query("""
            SELECT rw FROM RankingWeight rw
            JOIN rw.category c
            WHERE c.code = :code
            """)
    List<RankingWeight> findWeightEntities(@Param("code") String code);

    default Map<String, Double> findWeightsByCategoryCode(String code) {
        return findWeightEntities(code).stream()
                .collect(Collectors.toMap(
                        RankingWeight::getCriteria,
                        rw -> rw.getWeight().doubleValue()   // BigDecimal → Double
                ));
    }
}

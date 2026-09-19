package com.shoppingagent.product;

import com.shoppingagent.shared.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    /**
     * Lấy sản phẩm ứng viên theo ngành hàng và lọc sơ bộ theo giá.
     * Lọc chi tiết hơn (spec) sẽ thực hiện trong RankingService.
     */
    @Query("""
            SELECT p FROM Product p
            JOIN p.category c
            WHERE c.code = :categoryCode
              AND p.isActive = TRUE
              AND (:budgetMin IS NULL OR p.price >= :budgetMin)
              AND (:budgetMax IS NULL OR p.price <= :budgetMax)
            ORDER BY p.avgRating DESC NULLS LAST
            """)
    List<Product> findCandidates(@Param("categoryCode") String categoryCode,
                                  @Param("budgetMin") Long budgetMin,
                                  @Param("budgetMax") Long budgetMax);

    /** Lấy tất cả sản phẩm active của một ngành hàng (dùng cho admin) */
    @Query("SELECT p FROM Product p JOIN p.category c WHERE c.code = :code AND p.isActive = TRUE")
    List<Product> findByCategoryCode(@Param("code") String code);
}

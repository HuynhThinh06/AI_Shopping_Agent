package com.shoppingagent.product;

import com.shoppingagent.shared.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    /**
     * [MỚI - B7] Tìm kiếm sản phẩm với filter tùy chọn + phân trang.
     *
     * Tất cả tham số filter đều nullable:
     *   - categoryCode null → không lọc theo ngành hàng
     *   - minPrice / maxPrice null → không giới hạn giá
     *   - keyword null → không lọc theo tên/hãng
     *
     * keyword khớp cả name lẫn brand (OR), không phân biệt hoa/thường.
     */
    @Query("""
            SELECT p FROM Product p
            JOIN p.category c
            WHERE p.isActive = TRUE
              AND (:categoryCode IS NULL OR c.code          = :categoryCode)
              AND (:minPrice     IS NULL OR p.price         >= :minPrice)
              AND (:maxPrice     IS NULL OR p.price         <= :maxPrice)
              AND (:keyword      IS NULL
                   OR LOWER(p.name)  LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(p.brand) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<Product> searchProducts(
            @Param("categoryCode") String   categoryCode,
            @Param("minPrice")     Long     minPrice,
            @Param("maxPrice")     Long     maxPrice,
            @Param("keyword")      String   keyword,
            Pageable pageable
    );
}

package com.shoppingagent.favorite;

import com.shoppingagent.shared.entity.UserFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Integer> {

    @Query("SELECT uf FROM UserFavorite uf JOIN FETCH uf.product WHERE uf.user.id = :userId ORDER BY uf.createdAt DESC")
    List<UserFavorite> findByUserId(@Param("userId") Integer userId);

    @Query("SELECT uf FROM UserFavorite uf JOIN FETCH uf.product WHERE LOWER(uf.user.email) = LOWER(:email) ORDER BY uf.createdAt DESC")
    List<UserFavorite> findByUserEmail(@Param("email") String email);

    @Query("SELECT uf.product.id FROM UserFavorite uf WHERE uf.user.id = :userId ORDER BY uf.createdAt DESC")
    List<Long> findProductIdsByUserId(@Param("userId") Integer userId);

    @Query("SELECT uf.product.id FROM UserFavorite uf WHERE LOWER(uf.user.email) = LOWER(:email) ORDER BY uf.createdAt DESC")
    List<Long> findProductIdsByUserEmail(@Param("email") String email);

    @Query("SELECT uf FROM UserFavorite uf WHERE uf.user.id = :userId AND uf.product.id = :productId")
    Optional<UserFavorite> findByUserIdAndProductId(@Param("userId") Integer userId, @Param("productId") Long productId);

    @Query("SELECT uf FROM UserFavorite uf WHERE LOWER(uf.user.email) = LOWER(:email) AND uf.product.id = :productId")
    Optional<UserFavorite> findByUserEmailAndProductId(@Param("email") String email, @Param("productId") Long productId);

    @Query("SELECT COUNT(uf) > 0 FROM UserFavorite uf WHERE uf.user.id = :userId AND uf.product.id = :productId")
    boolean existsByUserIdAndProductId(@Param("userId") Integer userId, @Param("productId") Long productId);

    @Query("SELECT COUNT(uf) > 0 FROM UserFavorite uf WHERE LOWER(uf.user.email) = LOWER(:email) AND uf.product.id = :productId")
    boolean existsByUserEmailAndProductId(@Param("email") String email, @Param("productId") Long productId);

    @Modifying
    @Transactional
    @Query("DELETE FROM UserFavorite uf WHERE uf.user.id = :userId AND uf.product.id = :productId")
    void deleteByUserIdAndProductId(@Param("userId") Integer userId, @Param("productId") Long productId);

    @Modifying
    @Transactional
    @Query("DELETE FROM UserFavorite uf WHERE LOWER(uf.user.email) = LOWER(:email) AND uf.product.id = :productId")
    void deleteByUserEmailAndProductId(@Param("email") String email, @Param("productId") Long productId);
}

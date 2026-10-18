package com.shoppingagent.admin;

import com.shoppingagent.shared.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    @Query("""
            SELECT u FROM User u
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(u.displayName) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:role IS NULL OR :role = '' OR LOWER(u.role) = LOWER(:role))
            """)
    Page<User> searchUsers(@Param("keyword") String keyword, @Param("role") String role, Pageable pageable);
}

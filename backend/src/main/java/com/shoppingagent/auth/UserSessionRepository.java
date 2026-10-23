package com.shoppingagent.auth;

import com.shoppingagent.shared.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    Optional<UserSession> findByTokenHash(String tokenHash);

    List<UserSession> findByUserIdAndIsRevokedFalseAndExpiresAtAfterOrderByLastActiveAtDesc(Integer userId, LocalDateTime now);

    @Modifying
    @Query("UPDATE UserSession s SET s.isRevoked = true WHERE s.user.id = :userId")
    void revokeAllByUserId(@Param("userId") Integer userId);

    @Modifying
    @Query("UPDATE UserSession s SET s.isRevoked = true WHERE s.user.id = :userId AND s.id <> :currentSessionId")
    void revokeAllOtherSessions(@Param("userId") Integer userId, @Param("currentSessionId") Long currentSessionId);
}

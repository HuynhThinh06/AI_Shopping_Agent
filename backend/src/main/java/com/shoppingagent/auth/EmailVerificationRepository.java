package com.shoppingagent.auth;

import com.shoppingagent.shared.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findTopByEmailAndTypeAndIsUsedFalseOrderByCreatedAtDesc(String email, String type);

    void deleteAllByEmail(String email);
}

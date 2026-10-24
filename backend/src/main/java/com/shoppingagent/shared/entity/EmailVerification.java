package com.shoppingagent.shared.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_verifications", indexes = {
        @Index(name = "idx_email_verif_email", columnList = "email"),
        @Index(name = "idx_email_verif_type", columnList = "type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "otp_hash", nullable = false, length = 64)
    private String otpHash; // SHA-256 hash của mã OTP 6 số

    @Column(nullable = false, length = 50)
    private String type; // "REGISTRATION", "FORGOT_PASSWORD"

    @Column(name = "registration_payload", columnDefinition = "TEXT")
    private String registrationPayload; // JSON chứa username, passwordHash, displayName

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Builder.Default
    @Column(name = "attempts", nullable = false)
    private Integer attempts = 0;

    @Builder.Default
    @Column(name = "is_used", nullable = false)
    private Boolean isUsed = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

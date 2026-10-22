package com.shoppingagent.shared.security;

import com.shoppingagent.shared.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SecurityAndRbacTest — Kiểm thử Hộp Trắng các kịch bản Bảo mật JWT & Tấn công giả mạo")
class SecurityAndRbacTest {

    private JwtTokenProvider jwtTokenProvider;
    private final String validSecret = "this-is-a-valid-secure-jwt-key-with-more-than-256-bits-of-entropy-2026";

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", validSecret);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMs", 3600000L);
        jwtTokenProvider.init();
    }

    @Test
    @DisplayName("Bảo mật 1: Phát hiện và từ chối Token đã hết hạn (Expired JWT Token)")
    void shouldRejectExpiredToken() {
        SecretKey key = Keys.hmacShaKeyFor(validSecret.getBytes(StandardCharsets.UTF_8));
        Date past = new Date(System.currentTimeMillis() - 10000); // 10s trước

        String expiredToken = Jwts.builder()
                .subject("hacker")
                .claim("role", "admin")
                .issuedAt(new Date(System.currentTimeMillis() - 20000))
                .expiration(past)
                .signWith(key)
                .compact();

        boolean isValid = jwtTokenProvider.validateToken(expiredToken);
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Bảo mật 2: Phát hiện và từ chối Token bị ký bằng Secret Key giả mạo (Forged Key Attack)")
    void shouldRejectTokenSignedWithForgedKey() {
        String forgedSecret = "attacker-fake-secret-key-that-also-has-more-than-256-bits-length-12345";
        SecretKey forgedKey = Keys.hmacShaKeyFor(forgedSecret.getBytes(StandardCharsets.UTF_8));

        String fakeAdminToken = Jwts.builder()
                .subject("admin")
                .claim("role", "admin")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(forgedKey)
                .compact();

        boolean isValid = jwtTokenProvider.validateToken(fakeAdminToken);
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Bảo mật 3: Từ chối Token bị can thiệp thân payload (Signature Mismatch Tampering)")
    void shouldRejectTokenWhenPayloadIsTampered() {
        User user = User.builder()
                .id(1)
                .username("user1")
                .email("user1@mail.com")
                .role("user")
                .displayName("Normal User")
                .build();

        String token = jwtTokenProvider.generateToken(user);

        // Can thiệp sửa ký tự trong chuỗi base64 của payload
        String[] parts = token.split("\\.");
        assertThat(parts).hasSize(3);

        String tamperedPayload = parts[1].substring(0, parts[1].length() - 2) + "==";
        String tamperedToken = parts[0] + "." + tamperedPayload + "." + parts[2];

        boolean isValid = jwtTokenProvider.validateToken(tamperedToken);
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Bảo mật 4: Xử lý chuỗi Token dị dạng (Malformed/Injection Strings)")
    void shouldHandleMalformedTokensGracefully() {
        assertThat(jwtTokenProvider.validateToken("Bearer null")).isFalse();
        assertThat(jwtTokenProvider.validateToken("admin' OR '1'='1")).isFalse();
        assertThat(jwtTokenProvider.validateToken("<script>alert(1)</script>")).isFalse();
        assertThat(jwtTokenProvider.validateToken("..")).isFalse();
    }
}

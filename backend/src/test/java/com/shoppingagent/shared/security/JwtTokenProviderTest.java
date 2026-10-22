package com.shoppingagent.shared.security;

import com.shoppingagent.shared.entity.User;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JwtTokenProvider — Kiểm thử Hộp Trắng thuật toán ký số và giải mã Token JWT")
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    private final String secret = "test-super-secret-key-at-least-256-bits-long-for-hmac-sha256-testing-123456789";
    private final long expirationMs = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", secret);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMs", expirationMs);
        jwtTokenProvider.init();
    }

    @Test
    @DisplayName("Tạo JWT Token hợp lệ và trích xuất đúng các Claims")
    void shouldGenerateAndExtractClaimsProperly() {
        User user = User.builder()
                .id(99)
                .username("test_admin")
                .email("admin@test.vn")
                .role("admin")
                .displayName("Test Administrator")
                .build();

        String token = jwtTokenProvider.generateToken(user);
        assertThat(token).isNotBlank();

        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getUsernameFromToken(token)).isEqualTo("test_admin");

        Claims claims = jwtTokenProvider.getClaimsFromToken(token);
        assertThat(claims.get("userId", Integer.class)).isEqualTo(99);
        assertThat(claims.get("email", String.class)).isEqualTo("admin@test.vn");
        assertThat(claims.get("role", String.class)).isEqualTo("admin");
    }

    @Test
    @DisplayName("Từ chối token khi bị sửa đổi chữ ký hoặc định dạng rác")
    void shouldRejectTamperedOrInvalidToken() {
        assertThat(jwtTokenProvider.validateToken("invalid.token.structure")).isFalse();
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
        assertThat(jwtTokenProvider.validateToken(null)).isFalse();
    }
}

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

    @Test
    @DisplayName("Bảo mật 5: JwtAuthenticationFilter từ chối ngay Token của tài khoản đã bị Admin khóa (is_active = false)")
    void shouldRejectTokenForLockedUserInFilter() throws Exception {
        User lockedUser = User.builder()
                .id(8)
                .username("spammer_bot")
                .email("spambot999@disposable.org")
                .role("user")
                .isActive(false)
                .build();
        String validJwt = jwtTokenProvider.generateToken(lockedUser);

        UserAuthCacheService cacheService = org.mockito.Mockito.mock(UserAuthCacheService.class);
        org.mockito.Mockito.when(cacheService.getSnapshot(8))
                .thenReturn(new UserAuthCacheService.UserAuthSnapshot(8, "spammer_bot", "spambot999@disposable.org", "user", false));

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtTokenProvider, cacheService);
        org.springframework.mock.web.MockHttpServletRequest req = new org.springframework.mock.web.MockHttpServletRequest();
        req.addHeader("Authorization", "Bearer " + validJwt);
        org.springframework.mock.web.MockHttpServletResponse res = new org.springframework.mock.web.MockHttpServletResponse();
        org.springframework.mock.web.MockFilterChain chain = new org.springframework.mock.web.MockFilterChain();

        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        filter.doFilterInternal(req, res, chain);

        assertThat(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Bảo mật 6: JwtAuthenticationFilter áp dụng ngay vai trò mới nhất từ DB/Cache thay vì role cũ trong JWT")
    void shouldUseUpdatedRoleFromSnapshotInFilter() throws Exception {
        User user = User.builder()
                .id(3)
                .username("tuananh")
                .email("tuananh.dev@gmail.com")
                .role("admin") // Token cũ đang giữ quyền admin
                .isActive(true)
                .build();
        String oldAdminJwt = jwtTokenProvider.generateToken(user);

        UserAuthCacheService cacheService = org.mockito.Mockito.mock(UserAuthCacheService.class);
        // Trong DB đã bị hạ xuống 'user'
        org.mockito.Mockito.when(cacheService.getSnapshot(3))
                .thenReturn(new UserAuthCacheService.UserAuthSnapshot(3, "tuananh", "tuananh.dev@gmail.com", "user", true));

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtTokenProvider, cacheService);
        org.springframework.mock.web.MockHttpServletRequest req = new org.springframework.mock.web.MockHttpServletRequest();
        req.addHeader("Authorization", "Bearer " + oldAdminJwt);
        org.springframework.mock.web.MockHttpServletResponse res = new org.springframework.mock.web.MockHttpServletResponse();
        org.springframework.mock.web.MockFilterChain chain = new org.springframework.mock.web.MockFilterChain();

        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        filter.doFilterInternal(req, res, chain);

        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_USER");
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }
}

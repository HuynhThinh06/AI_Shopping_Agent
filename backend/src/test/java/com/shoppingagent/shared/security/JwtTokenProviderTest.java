package com.shoppingagent.shared.security;

import com.shoppingagent.shared.entity.User;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    @Test
    @DisplayName("Bảo mật: Từ chối khởi động (Fail-Fast) khi JWT_SECRET bị thiếu hoặc rỗng")
    void shouldFailFastWhenSecretIsMissingOrBlank() {
        JwtTokenProvider providerMissing = new JwtTokenProvider();
        assertThatThrownBy(providerMissing::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("chưa được thiết lập");

        JwtTokenProvider providerBlank = new JwtTokenProvider();
        ReflectionTestUtils.setField(providerBlank, "jwtSecret", "   ");
        assertThatThrownBy(providerBlank::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("chưa được thiết lập");
    }

    @Test
    @DisplayName("Bảo mật: Từ chối khởi động khi JWT_SECRET quá ngắn (< 256 bits / 32 bytes)")
    void shouldFailFastWhenSecretIsTooShort() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", "short-key-under-32-bytes");
        assertThatThrownBy(provider::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("quá ngắn");
    }

    @Test
    @DisplayName("Bảo mật: Từ chối khởi động khi JWT_SECRET là chuỗi mặc định hard-coded không an toàn")
    void shouldFailFastWhenSecretIsKnownInsecureDefault() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret",
                "shopping-agent-jwt-super-secret-key-must-be-at-least-256-bits-long-2026!");
        assertThatThrownBy(provider::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("chuỗi khóa mặc định/hard-coded không an toàn");
    }

    @Test
    @DisplayName("HMAC-SHA-256 OTP: Sinh mã băm 64 ký tự hex và xác thực mã OTP chính xác")
    void shouldHashOtpWithHmacSha256AndVerifySuccessfully() {
        String rawOtp = "123456";
        String otpHash = jwtTokenProvider.hashOtp(rawOtp);

        assertThat(otpHash).isNotBlank();
        assertThat(otpHash).hasSize(64); // 256 bits = 32 bytes = 64 hex characters
        assertThat(otpHash).matches("^[a-f0-9]{64}$");

        // Xác thực đúng
        assertThat(jwtTokenProvider.verifyOtp(rawOtp, otpHash)).isTrue();

        // Xác thực sai
        assertThat(jwtTokenProvider.verifyOtp("654321", otpHash)).isFalse();
        assertThat(jwtTokenProvider.verifyOtp("12345", otpHash)).isFalse();
        assertThat(jwtTokenProvider.verifyOtp(null, otpHash)).isFalse();
        assertThat(jwtTokenProvider.verifyOtp(rawOtp, null)).isFalse();
    }

    @Test
    @DisplayName("HMAC-SHA-256 OTP: Tính toán tính chất phân tán (Avalanche Effect) và tính xác định")
    void shouldExhibitDeterministicAndAvalancheProperties() {
        String hash1 = jwtTokenProvider.hashOtp("123456");
        String hash2 = jwtTokenProvider.hashOtp("123456");
        String hashDifferent = jwtTokenProvider.hashOtp("123457");

        // Tính xác định: cùng OTP và cùng Secret cho ra cùng Hash
        assertThat(hash1).isEqualTo(hash2);

        // Hiệu ứng phân tán: chỉ đổi 1 chữ số cuối nhưng hash hoàn toàn khác biệt
        assertThat(hash1).isNotEqualTo(hashDifferent);
    }

    @Test
    @DisplayName("HMAC-SHA-256 OTP: Hỗ trợ Server-Side Pepper độc lập qua OTP_SECRET")
    void shouldUseDedicatedOtpSecretWhenProvided() {
        String defaultHash = jwtTokenProvider.hashOtp("888888");

        // Thiết lập OTP_SECRET riêng biệt
        ReflectionTestUtils.setField(jwtTokenProvider, "otpSecret", "dedicated-otp-pepper-secret-key-32bytes!!");
        String dedicatedPepperHash = jwtTokenProvider.hashOtp("888888");

        assertThat(dedicatedPepperHash).isNotBlank();
        assertThat(dedicatedPepperHash).hasSize(64);
        assertThat(dedicatedPepperHash).isNotEqualTo(defaultHash);
        assertThat(jwtTokenProvider.verifyOtp("888888", dedicatedPepperHash)).isTrue();
    }
}

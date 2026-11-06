package com.shoppingagent.shared.security;

import com.shoppingagent.shared.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Set;

@Slf4j
@Component
public class JwtTokenProvider {

    private static final Set<String> INSECURE_DEFAULT_SECRETS = Set.of(
            "shopping-agent-jwt-super-secret-key-must-be-at-least-256-bits-long-2026!",
            "your_jwt_secret_here",
            "secret",
            "changeme",
            "12345678901234567890123456789012"
    );

    private static final int MIN_KEY_BYTES = 32; // 256 bits tối thiểu cho HMAC-SHA256

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${security.otp.secret:${jwt.secret:}}")
    private String otpSecret;

    @Value("${jwt.expiration-ms:900000}")
    private long jwtExpirationMs;

    @Value("${jwt.refresh-expiration-ms:604800000}")
    private long jwtRefreshExpirationMs;

    private SecretKey secretKey;

    @PostConstruct
    public void init() {
        validateSecretKey(this.jwtSecret);
        validateOtpSecret(this.otpSecret);
        this.secretKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    private void validateOtpSecret(String secret) {
        if (secret != null && !secret.isBlank()) {
            byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
            if (secretBytes.length < MIN_KEY_BYTES) {
                log.warn("[Security] OTP_SECRET is shorter than 256 bits ({} bytes). Recommended length is >= 32 bytes.", secretBytes.length);
            }
        }
    }

    private void validateSecretKey(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "CẤU HÌNH BẢO MẬT THẤT BẠI: Biến môi trường JWT_SECRET chưa được thiết lập. " +
                    "Ứng dụng từ chối khởi động để ngăn chặn lỗ hổng bảo mật giả mạo token. " +
                    "Vui lòng cấu hình JWT_SECRET với ít nhất 256-bit entropy (ví dụ: 'openssl rand -base64 48')."
            );
        }

        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < MIN_KEY_BYTES) {
            throw new IllegalStateException(
                    "CẤU HÌNH BẢO MẬT THẤT BẠI: JWT_SECRET quá ngắn (" + secretBytes.length + " bytes). " +
                    "Thuật toán HMAC-SHA256 yêu cầu khóa bí mật tối thiểu " + MIN_KEY_BYTES + " bytes (256 bits)."
            );
        }

        if (INSECURE_DEFAULT_SECRETS.contains(secret.trim())) {
            throw new IllegalStateException(
                    "CẤU HÌNH BẢO MẬT THẤT BẠI: JWT_SECRET đang sử dụng chuỗi khóa mặc định/hard-coded không an toàn đã biết. " +
                    "Vui lòng tạo một khóa ngẫu nhiên mới có độ entropy cao."
            );
        }
    }

    public long getJwtExpirationMs() {
        return jwtExpirationMs;
    }

    public long getJwtRefreshExpirationMs() {
        return jwtRefreshExpirationMs;
    }

    /**
     * Sinh Access Token thời hạn ngắn (15 phút) lưu vào RAM / Authorization Header
     */
    public String generateToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .subject(user.getUsername())
                .claim("userId", user.getId())
                .claim("email", user.getEmail())
                .claim("role", user.getRole())
                .claim("displayName", user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }

    /**
     * Sinh Refresh Token ngẫu nhiên có độ entropy cao (CSPs) thời hạn 7 ngày
     */
    public String generateRefreshToken() {
        byte[] randomBytes = new byte[48];
        new java.security.SecureRandom().nextBytes(randomBytes);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    /**
     * Băm Token bằng SHA-256 để lưu trữ an toàn trong Database (chống lộ token nếu DB bị rò rỉ)
     */
    public String hashToken(String token) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi băm token bảo mật", e);
        }
    }

    /**
     * Băm mã OTP 6 chữ số bằng HMAC-SHA-256 kết hợp khóa bí mật ngoài CSDL (Server-Side Pepper)
     * Ngăn chặn tấn công vét cạn ngoại tuyến (Offline Brute-Force) khi CSDL bị rò rỉ.
     */
    public String hashOtp(String otp) {
        if (otp == null) return null;
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            String effectiveSecret = (otpSecret != null && !otpSecret.isBlank()) ? otpSecret : jwtSecret;
            javax.crypto.spec.SecretKeySpec keySpec = new javax.crypto.spec.SecretKeySpec(
                    effectiveSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hmacBytes = mac.doFinal(otp.trim().getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hmacBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tính toán HMAC-SHA-256 cho mã OTP", e);
        }
    }

    /**
     * Đối chiếu mã OTP người dùng nhập vào so với giá trị băm trong cơ sở dữ liệu.
     * Sử dụng MessageDigest.isEqual để chống tấn công phân tích thời gian thực thi (Timing Attack).
     */
    public boolean verifyOtp(String rawOtp, String expectedHash) {
        if (rawOtp == null || expectedHash == null) {
            return false;
        }
        String computedHash = hashOtp(rawOtp);
        return java.security.MessageDigest.isEqual(
                computedHash.getBytes(StandardCharsets.UTF_8),
                expectedHash.getBytes(StandardCharsets.UTF_8)
        );
    }

    public Claims getClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String getUsernameFromToken(String token) {
        return getClaimsFromToken(token).getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token);
            return true;
        } catch (Exception ex) {
            log.warn("[JWT] Invalid token: {}", ex.getMessage());
            return false;
        }
    }
}

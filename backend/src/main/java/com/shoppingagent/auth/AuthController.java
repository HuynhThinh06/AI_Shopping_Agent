package com.shoppingagent.auth;

import com.shoppingagent.auth.dto.*;
import com.shoppingagent.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication & Authorization", description = "Đăng nhập, đăng ký và xác thực tài khoản JWT với Refresh Token Rotation (RTR)")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập hệ thống (bằng username hoặc email + password)")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        AuthResponse res = authService.login(request, httpRequest);
        setRefreshTokenCookie(httpResponse, res.getRefreshToken());
        return ResponseEntity.ok(res);
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản người dùng mới (trực tiếp)")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        AuthResponse res = authService.register(request, httpRequest);
        setRefreshTokenCookie(httpResponse, res.getRefreshToken());
        return ResponseEntity.ok(res);
    }

    @PostMapping("/register-initiate")
    @Operation(summary = "Bước 1: Tiếp nhận thông tin đăng ký, sinh OTP và gửi qua Gmail")
    public ResponseEntity<RegisterInitiateResponse> initiateRegistration(
            @Valid @RequestBody RegisterRequest request
    ) {
        RegisterInitiateResponse res = authService.initiateRegistration(request);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/register-verify")
    @Operation(summary = "Bước 2: Xác nhận OTP từ Gmail, tạo tài khoản chính thức và cấp JWT token")
    public ResponseEntity<AuthResponse> verifyRegistrationOtp(
            @Valid @RequestBody VerifyOtpRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        AuthResponse res = authService.verifyRegistrationOtp(request, httpRequest);
        setRefreshTokenCookie(httpResponse, res.getRefreshToken());
        return ResponseEntity.ok(res);
    }

    @PostMapping("/resend-otp")
    @Operation(summary = "Gửi lại mã OTP qua Gmail khi mã cũ hết hạn hoặc thất lạc")
    public ResponseEntity<RegisterInitiateResponse> resendOtp(
            @Valid @RequestBody ResendOtpRequest request
    ) {
        RegisterInitiateResponse res = authService.resendRegistrationOtp(request);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Làm mới Access Token thông qua Refresh Token Rotation (RTR)")
    public ResponseEntity<AuthResponse> refreshToken(
            @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        String rawToken = extractRefreshToken(httpRequest, request);
        AuthResponse res = authService.refreshToken(rawToken, httpRequest);
        setRefreshTokenCookie(httpResponse, res.getRefreshToken());
        return ResponseEntity.ok(res);
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất khỏi hệ thống và vô hiệu hóa phiên làm việc")
    public ResponseEntity<Map<String, String>> logout(
            @RequestBody(required = false) RefreshTokenRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        String rawToken = extractRefreshToken(httpRequest, request);
        authService.logout(rawToken, principal != null ? principal.getId() : null);
        clearRefreshTokenCookie(httpResponse);
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công"));
    }

    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin tài khoản đang đăng nhập")
    public ResponseEntity<AuthResponse.UserSummary> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(authService.getMe(principal.getUsername()));
    }

    @GetMapping("/sessions")
    @Operation(summary = "Xem danh sách các thiết bị & phiên đăng nhập đang hoạt động")
    public ResponseEntity<List<UserSessionDTO>> getSessions(
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        String currentToken = extractRefreshToken(httpRequest, null);
        return ResponseEntity.ok(authService.getActiveSessions(principal.getId(), currentToken));
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "Thu hồi từ xa một phiên đăng nhập cụ thể")
    public ResponseEntity<Map<String, Object>> revokeSession(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        authService.revokeSession(principal.getId(), sessionId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã thu hồi phiên đăng nhập #" + sessionId));
    }

    @DeleteMapping("/sessions/other")
    @Operation(summary = "Đăng xuất khỏi tất cả các thiết bị khác")
    public ResponseEntity<Map<String, Object>> revokeOtherSessions(
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        String currentToken = extractRefreshToken(httpRequest, null);
        authService.revokeAllOtherSessions(principal.getId(), currentToken);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã đăng xuất khỏi tất cả các thiết bị khác thành công"));
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        if (refreshToken == null) return;
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(false) // Để false ở local dev, khi deploy HTTPS sẽ qua reverse proxy
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofDays(7))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String extractRefreshToken(HttpServletRequest request, RefreshTokenRequest body) {
        if (body != null && body.getRefreshToken() != null && !body.getRefreshToken().isBlank()) {
            return body.getRefreshToken().trim();
        }
        if (request != null && request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("refreshToken".equals(c.getName())) {
                    return c.getValue();
                }
            }
        }
        return null;
    }
}

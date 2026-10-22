package com.shoppingagent.auth;

import com.shoppingagent.auth.dto.AuthResponse;
import com.shoppingagent.auth.dto.LoginRequest;
import com.shoppingagent.auth.dto.RegisterRequest;
import com.shoppingagent.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication & Authorization", description = "Đăng nhập, đăng ký và xác thực tài khoản JWT")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập hệ thống (bằng username hoặc email + password)")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản người dùng mới")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin tài khoản đang đăng nhập")
    public ResponseEntity<AuthResponse.UserSummary> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(authService.getMe(principal.getUsername()));
    }
}

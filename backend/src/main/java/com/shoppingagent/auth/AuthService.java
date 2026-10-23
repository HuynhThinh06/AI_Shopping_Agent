package com.shoppingagent.auth;

import com.shoppingagent.admin.UserRepository;
import com.shoppingagent.auth.dto.AuthResponse;
import com.shoppingagent.auth.dto.LoginRequest;
import com.shoppingagent.auth.dto.RegisterRequest;
import com.shoppingagent.shared.entity.User;
import com.shoppingagent.shared.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthResponse login(LoginRequest request) {
        String identifier = request.getUsernameOrEmail().trim();
        User user = userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản hoặc mật khẩu không chính xác"));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new IllegalStateException("Tài khoản của bạn đã bị khóa bởi Quản trị viên");
        }

        // Kiểm tra mật khẩu (hỗ trợ BCrypt hoặc fallback cập nhật cho seed data cũ)
        boolean passwordMatches = false;
        if (user.getPasswordHash() != null) {
            if (user.getPasswordHash().startsWith("$2a$") || user.getPasswordHash().startsWith("$2b$")) {
                passwordMatches = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());
            } else if (user.getPasswordHash().equals(request.getPassword())) {
                passwordMatches = true;
                user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
                userRepository.save(user);
            }
        }

        if (!passwordMatches) {
            throw new IllegalArgumentException("Tài khoản hoặc mật khẩu không chính xác");
        }

        String token = jwtTokenProvider.generateToken(user);
        log.info("[Auth] User logged in successfully: username={}, role={}", user.getUsername(), user.getRole());

        return toAuthResponse(token, user);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = request.getUsername().trim().toLowerCase();
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại trong hệ thống");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email đã được đăng ký trong hệ thống");
        }

        String displayName = request.getDisplayName();
        if (displayName == null || displayName.isBlank()) {
            displayName = username;
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .displayName(displayName.trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role("user")
                .isActive(true)
                .build();

        user = userRepository.save(user);
        String token = jwtTokenProvider.generateToken(user);
        log.info("[Auth] User registered successfully: id={}, username={}", user.getId(), user.getUsername());

        return toAuthResponse(token, user);
    }

    public AuthResponse.UserSummary getMe(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin người dùng"));
        return toUserSummary(user);
    }

    private AuthResponse toAuthResponse(String token, User user) {
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .user(toUserSummary(user))
                .build();
    }

    private AuthResponse.UserSummary toUserSummary(User user) {
        return AuthResponse.UserSummary.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .build();
    }
}

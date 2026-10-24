package com.shoppingagent.auth;

import com.shoppingagent.admin.UserRepository;
import com.shoppingagent.auth.dto.AuthResponse;
import com.shoppingagent.auth.dto.LoginRequest;
import com.shoppingagent.auth.dto.RegisterRequest;
import com.shoppingagent.auth.dto.UserSessionDTO;
import com.shoppingagent.shared.entity.User;
import com.shoppingagent.shared.entity.UserSession;
import com.shoppingagent.shared.security.JwtTokenProvider;
import com.shoppingagent.shared.security.RateLimiterService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService — Kiểm thử xác thực, JWT pair, RTR và Quản lý phiên (Session Management)")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserSessionRepository userSessionRepository;

    @Mock
    private EmailVerificationRepository emailVerificationRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private RateLimiterService rateLimiterService;

    @InjectMocks
    private AuthService authService;

    @Test
    @DisplayName("Đăng nhập thành công với username và password chính xác")
    void shouldLoginSuccessfullyWithUsername() {
        User user = User.builder()
                .id(1)
                .username("admin")
                .email("admin@shoppingagent.com")
                .passwordHash("$2a$10$hashedPassword")
                .role("admin")
                .displayName("Admin User")
                .isActive(true)
                .build();

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "$2a$10$hashedPassword")).thenReturn(true);
        when(jwtTokenProvider.generateToken(user)).thenReturn("mock-jwt-token");
        when(jwtTokenProvider.generateRefreshToken()).thenReturn("mock-refresh-token");
        when(jwtTokenProvider.hashToken("mock-refresh-token")).thenReturn("mock-token-hash");
        when(jwtTokenProvider.getJwtExpirationMs()).thenReturn(900000L);

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("admin")
                .password("password123")
                .build();

        AuthResponse response = authService.login(request, null);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("mock-jwt-token");
        assertThat(response.getAccessToken()).isEqualTo("mock-jwt-token");
        assertThat(response.getRefreshToken()).isEqualTo("mock-refresh-token");
        assertThat(response.getUser().getUsername()).isEqualTo("admin");
        assertThat(response.getUser().getRole()).isEqualTo("admin");
        verify(userSessionRepository, times(1)).save(any(UserSession.class));
    }

    @Test
    @DisplayName("Đăng nhập thất bại khi sai mật khẩu")
    void shouldFailLoginWhenPasswordIncorrect() {
        User user = User.builder()
                .id(2)
                .username("tuananh")
                .email("tuananh@gmail.com")
                .passwordHash("$2a$10$hashedPassword")
                .role("user")
                .isActive(true)
                .build();

        when(userRepository.findByUsername("tuananh")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpass", "$2a$10$hashedPassword")).thenReturn(false);

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("tuananh")
                .password("wrongpass")
                .build();

        assertThatThrownBy(() -> authService.login(request, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Tài khoản hoặc mật khẩu không chính xác");
    }

    @Test
    @DisplayName("Đăng nhập thất bại khi tài khoản bị khóa (isActive = false)")
    void shouldFailLoginWhenAccountIsLocked() {
        User user = User.builder()
                .id(3)
                .username("spambot")
                .email("spam@bot.com")
                .passwordHash("$2a$10$hashedPassword")
                .role("user")
                .isActive(false)
                .build();

        when(userRepository.findByUsername("spambot")).thenReturn(Optional.of(user));

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("spambot")
                .password("password123")
                .build();

        assertThatThrownBy(() -> authService.login(request, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Tài khoản của bạn đã bị khóa");
    }

    @Test
    @DisplayName("Đăng ký tài khoản mới thành công")
    void shouldRegisterNewUserSuccessfully() {
        RegisterRequest request = RegisterRequest.builder()
                .username("newuser")
                .email("newuser@example.com")
                .password("secret123")
                .displayName("New Member")
                .build();

        when(userRepository.findByUsername("newuser")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("newuser@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret123")).thenReturn("$2a$10$encodedSecret");

        User savedUser = User.builder()
                .id(10)
                .username("newuser")
                .email("newuser@example.com")
                .displayName("New Member")
                .passwordHash("$2a$10$encodedSecret")
                .role("user")
                .isActive(true)
                .build();

        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtTokenProvider.generateToken(savedUser)).thenReturn("registered-jwt-token");
        when(jwtTokenProvider.generateRefreshToken()).thenReturn("mock-refresh-token");
        when(jwtTokenProvider.hashToken("mock-refresh-token")).thenReturn("mock-token-hash");
        when(jwtTokenProvider.getJwtExpirationMs()).thenReturn(900000L);

        AuthResponse response = authService.register(request, null);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("registered-jwt-token");
        assertThat(response.getAccessToken()).isEqualTo("registered-jwt-token");
        assertThat(response.getRefreshToken()).isEqualTo("mock-refresh-token");
        assertThat(response.getUser().getUsername()).isEqualTo("newuser");
        assertThat(response.getUser().getRole()).isEqualTo("user");
        verify(userSessionRepository, times(1)).save(any(UserSession.class));
    }

    @Test
    @DisplayName("Đăng ký thất bại khi tên đăng nhập đã trùng lặp")
    void shouldFailRegisterWhenUsernameExists() {
        RegisterRequest request = RegisterRequest.builder()
                .username("existinguser")
                .email("unique@example.com")
                .password("secret123")
                .build();

        when(userRepository.findByUsername("existinguser"))
                .thenReturn(Optional.of(User.builder().id(5).build()));

        assertThatThrownBy(() -> authService.register(request, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Tên đăng nhập đã tồn tại");
    }

    @Test
    @DisplayName("Refresh Token thành công với Refresh Token Rotation (RTR)")
    void shouldRefreshTokenSuccessfully() {
        User user = User.builder()
                .id(1)
                .username("tuananh")
                .role("user")
                .isActive(true)
                .build();

        UserSession activeSession = UserSession.builder()
                .id(100L)
                .user(user)
                .tokenHash("hashed-refresh-token")
                .isRevoked(false)
                .expiresAt(LocalDateTime.now().plusDays(5))
                .build();

        when(jwtTokenProvider.hashToken("valid-raw-refresh-token")).thenReturn("hashed-refresh-token");
        when(userSessionRepository.findByTokenHash("hashed-refresh-token")).thenReturn(Optional.of(activeSession));

        when(jwtTokenProvider.generateToken(user)).thenReturn("new-access-token");
        when(jwtTokenProvider.generateRefreshToken()).thenReturn("new-raw-refresh-token");
        when(jwtTokenProvider.hashToken("new-raw-refresh-token")).thenReturn("new-hashed-token");
        when(jwtTokenProvider.getJwtExpirationMs()).thenReturn(900000L);

        AuthResponse response = authService.refreshToken("valid-raw-refresh-token", null);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("new-access-token");
        assertThat(response.getRefreshToken()).isEqualTo("new-raw-refresh-token");
        assertThat(activeSession.getIsRevoked()).isTrue(); // Token cũ đã bị xoay vòng (revoke)
        verify(userSessionRepository, times(2)).save(any(UserSession.class)); // 1 lần revoke session cũ, 1 lần tạo session mới
    }

    @Test
    @DisplayName("Theft Detection: Phát hiện token đã bị thu hồi được sử dụng lại -> Hủy toàn bộ phiên làm việc của user")
    void shouldDetectTheftAndRevokeAllSessionsWhenRevokedTokenReused() {
        User user = User.builder()
                .id(1)
                .username("compromised_user")
                .build();

        UserSession revokedSession = UserSession.builder()
                .id(101L)
                .user(user)
                .tokenHash("stolen-token-hash")
                .isRevoked(true) // Đã bị revoke trước đó
                .expiresAt(LocalDateTime.now().plusDays(3))
                .build();

        when(jwtTokenProvider.hashToken("stolen-token")).thenReturn("stolen-token-hash");
        when(userSessionRepository.findByTokenHash("stolen-token-hash")).thenReturn(Optional.of(revokedSession));

        assertThatThrownBy(() -> authService.refreshToken("stolen-token", null))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Cảnh báo an toàn");

        verify(userSessionRepository, times(1)).revokeAllByUserId(1);
    }

    @Test
    @DisplayName("Thu hồi phiên đăng nhập của chính mình thành công")
    void shouldRevokeOwnSessionSuccessfully() {
        User user = User.builder().id(7).build();
        UserSession session = UserSession.builder().id(999L).user(user).isRevoked(false).build();

        when(userSessionRepository.findById(999L)).thenReturn(Optional.of(session));

        authService.revokeSession(7, 999L);

        assertThat(session.getIsRevoked()).isTrue();
        verify(userSessionRepository, times(1)).save(session);
    }
}

package com.shoppingagent.auth;

import com.shoppingagent.admin.UserRepository;
import com.shoppingagent.auth.dto.AuthResponse;
import com.shoppingagent.auth.dto.LoginRequest;
import com.shoppingagent.auth.dto.RegisterRequest;
import com.shoppingagent.shared.entity.User;
import com.shoppingagent.shared.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService — Kiểm thử quy trình xác thực, đăng nhập, đăng ký và cấp JWT Token")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

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

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("admin")
                .password("password123")
                .build();

        AuthResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("mock-jwt-token");
        assertThat(response.getUser().getUsername()).isEqualTo("admin");
        assertThat(response.getUser().getRole()).isEqualTo("admin");
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

        assertThatThrownBy(() -> authService.login(request))
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

        assertThatThrownBy(() -> authService.login(request))
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

        AuthResponse response = authService.register(request);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("registered-jwt-token");
        assertThat(response.getUser().getUsername()).isEqualTo("newuser");
        assertThat(response.getUser().getRole()).isEqualTo("user");
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

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Tên đăng nhập đã tồn tại");
    }
}

package com.shoppingagent.audit;

import com.shoppingagent.shared.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuditLogService — Kiểm thử ghi nhật ký thao tác Admin, lọc dữ liệu nhạy cảm và dọn log > 180 ngày")
class AuditLogServiceTest {

    @Mock
    private AdminAuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditLogService auditLogService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    @DisplayName("log — Ghi đúng thông tin Admin, địa chỉ IP X-Forwarded-For và tóm tắt thao tác")
    void shouldLogAdminIdentityAndClientIp() {
        UserPrincipal principal = UserPrincipal.builder()
                .id(2)
                .username("admin")
                .email("admin@shoppingagent.com")
                .role("admin")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
        );

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "203.113.148.10, 10.0.0.1");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        auditLogService.log(
                AuditAction.PRODUCT_UPDATE,
                "PRODUCT",
                165L,
                "Cập nhật sản phẩm #165",
                Map.of("before", Map.of("price", 20000000L), "after", Map.of("price", 19000000L))
        );

        ArgumentCaptor<AdminAuditLog> captor = ArgumentCaptor.forClass(AdminAuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AdminAuditLog saved = captor.getValue();
        assertThat(saved.getAdminId()).isEqualTo(2);
        assertThat(saved.getAdminUsername()).isEqualTo("admin");
        assertThat(saved.getAction()).isEqualTo("PRODUCT_UPDATE");
        assertThat(saved.getEntityType()).isEqualTo("PRODUCT");
        assertThat(saved.getEntityId()).isEqualTo("165");
        assertThat(saved.getIpAddress()).isEqualTo("203.113.148.10");
        assertThat(saved.getDetails()).containsKeys("before", "after");
    }

    @Test
    @DisplayName("log — Không bao giờ lưu các khóa nhạy cảm (password, passwordHash, token, secret) vào details")
    void shouldStripSensitiveFieldsFromDetails() {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("username", "tuananh");
        details.put("password", "user123");
        details.put("passwordHash", "$2a$10$secret");
        details.put("token", "eyJhbGciOi...");
        details.put("nested", Map.of("role", "admin", "secret_key", "do-not-save"));

        auditLogService.log(AuditAction.USER_ROLE_CHANGE, "USER", 3, "Đổi quyền", details);

        ArgumentCaptor<AdminAuditLog> captor = ArgumentCaptor.forClass(AdminAuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        Map<String, Object> savedDetails = captor.getValue().getDetails();
        assertThat(savedDetails).containsKey("username");
        assertThat(savedDetails).doesNotContainKeys("password", "passwordHash", "token");
        @SuppressWarnings("unchecked")
        Map<String, Object> nested = (Map<String, Object>) savedDetails.get("nested");
        assertThat(nested).containsEntry("role", "admin");
        assertThat(nested).doesNotContainKey("secret_key");
    }

    @Test
    @DisplayName("purgeOldLogs — Xóa các bản ghi nhật ký cũ hơn 180 ngày")
    void shouldPurgeLogsOlderThan180Days() {
        when(auditLogRepository.deleteByCreatedAtBefore(any(LocalDateTime.class))).thenReturn(12);

        int deleted = auditLogService.purgeOldLogs();

        assertThat(deleted).isEqualTo(12);
        ArgumentCaptor<LocalDateTime> cutoffCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(auditLogRepository).deleteByCreatedAtBefore(cutoffCaptor.capture());

        LocalDateTime cutoff = cutoffCaptor.getValue();
        assertThat(cutoff).isBefore(LocalDateTime.now().minusDays(179));
    }
}

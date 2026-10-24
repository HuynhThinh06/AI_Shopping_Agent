package com.shoppingagent.audit;

import com.shoppingagent.shared.security.UserPrincipal;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    public static final int RETENTION_DAYS = 180;
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "password", "passwordhash", "password_hash", "token", "secret", "authorization", "credentials"
    );

    private final AdminAuditLogRepository auditLogRepository;

    /**
     * Ghi nhận thao tác của quản trị viên trong cùng transaction với nghiệp vụ chính.
     * Nếu nghiệp vụ chính rollback thì bản ghi audit log cũng được rollback.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void log(AuditAction action, String entityType, Object entityId,
                    String summary, Map<String, Object> details) {
        Integer adminId = null;
        String adminUsername = "system";

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            Object principal = auth.getPrincipal();
            if (principal instanceof UserPrincipal up) {
                adminId = up.getId();
                if (up.getUsername() != null && !up.getUsername().isBlank()) {
                    adminUsername = up.getUsername();
                }
            } else if (auth.getName() != null && !auth.getName().isBlank()
                    && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                adminUsername = auth.getName();
            }
        }

        String ipAddress = resolveClientIp();
        String safeSummary = (summary != null && !summary.isBlank())
                ? (summary.length() > 500 ? summary.substring(0, 497) + "..." : summary)
                : action.name();

        Map<String, Object> sanitizedDetails = sanitizeDetails(details);

        AdminAuditLog entry = AdminAuditLog.builder()
                .adminId(adminId)
                .adminUsername(adminUsername)
                .action(action.name())
                .entityType(entityType != null ? entityType.toUpperCase() : "UNKNOWN")
                .entityId(entityId != null ? String.valueOf(entityId) : null)
                .summary(safeSummary)
                .details(sanitizedDetails)
                .ipAddress(ipAddress)
                .createdAt(LocalDateTime.now(VN_ZONE))
                .build();

        auditLogRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogDTO> getAuditLogs(String entityType,
                                          String action,
                                          String adminUsername,
                                          LocalDate from,
                                          LocalDate to,
                                          String keyword,
                                          Pageable pageable) {
        Specification<AdminAuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (entityType != null && !entityType.isBlank() && !"all".equalsIgnoreCase(entityType)) {
                predicates.add(cb.equal(cb.upper(root.get("entityType")), entityType.trim().toUpperCase()));
            }
            if (action != null && !action.isBlank() && !"all".equalsIgnoreCase(action)) {
                predicates.add(cb.equal(cb.upper(root.get("action")), action.trim().toUpperCase()));
            }
            if (adminUsername != null && !adminUsername.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("adminUsername")),
                        "%" + adminUsername.trim().toLowerCase() + "%"));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from.atStartOfDay()));
            }
            if (to != null) {
                predicates.add(cb.lessThan(root.get("createdAt"), to.plusDays(1).atStartOfDay()));
            }
            if (keyword != null && !keyword.isBlank()) {
                String kw = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("summary")), kw),
                        cb.like(cb.lower(cb.coalesce(root.get("entityId"), "")), kw),
                        cb.like(cb.lower(root.get("adminUsername")), kw)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return auditLogRepository.findAll(spec, pageable).map(this::toDTO);
    }

    /**
     * Tự động dọn dẹp nhật ký thao tác admin cũ quá 180 ngày vào 03:00 sáng hàng ngày.
     */
    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public int purgeOldLogs() {
        LocalDateTime cutoff = LocalDateTime.now(VN_ZONE).minusDays(RETENTION_DAYS);
        int deleted = auditLogRepository.deleteByCreatedAtBefore(cutoff);
        if (deleted > 0) {
            log.info("[AuditLog] Purged {} audit log entries older than {} days (before {})",
                    deleted, RETENTION_DAYS, cutoff);
        }
        return deleted;
    }

    private Map<String, Object> sanitizeDetails(Map<String, Object> raw) {
        if (raw == null || raw.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, Object> clean = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : raw.entrySet()) {
            String key = entry.getKey();
            if (key == null) continue;
            String normalizedKey = key.trim().toLowerCase().replace("-", "_");
            if (SENSITIVE_KEYS.contains(normalizedKey) || normalizedKey.contains("password") || normalizedKey.contains("secret")) {
                continue;
            }
            Object val = entry.getValue();
            if (val instanceof Map<?, ?> nested) {
                @SuppressWarnings("unchecked")
                Map<String, Object> nestedMap = (Map<String, Object>) nested;
                clean.put(key, sanitizeDetails(nestedMap));
            } else {
                clean.put(key, val);
            }
        }
        return clean;
    }

    private String resolveClientIp() {
        try {
            RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
            if (attrs instanceof ServletRequestAttributes servletAttrs) {
                HttpServletRequest req = servletAttrs.getRequest();
                String xff = req.getHeader("X-Forwarded-For");
                if (xff != null && !xff.isBlank()) {
                    String first = xff.split(",")[0].trim();
                    if (!first.isEmpty()) {
                        return first.length() > 45 ? first.substring(0, 45) : first;
                    }
                }
                String remote = req.getRemoteAddr();
                if (remote != null && !remote.isBlank()) {
                    return remote.length() > 45 ? remote.substring(0, 45) : remote;
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private AuditLogDTO toDTO(AdminAuditLog entity) {
        return AuditLogDTO.builder()
                .id(entity.getId())
                .adminId(entity.getAdminId())
                .adminUsername(entity.getAdminUsername())
                .action(entity.getAction())
                .entityType(entity.getEntityType())
                .entityId(entity.getEntityId())
                .summary(entity.getSummary())
                .details(entity.getDetails())
                .ipAddress(entity.getIpAddress())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}

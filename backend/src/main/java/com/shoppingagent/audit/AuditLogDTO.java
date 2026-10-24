package com.shoppingagent.audit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogDTO {
    private Long id;
    private Integer adminId;
    private String adminUsername;
    private String action;
    private String entityType;
    private String entityId;
    private String summary;
    private Map<String, Object> details;
    private String ipAddress;
    private LocalDateTime createdAt;
}

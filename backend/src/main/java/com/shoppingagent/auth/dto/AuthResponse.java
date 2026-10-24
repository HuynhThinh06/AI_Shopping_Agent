package com.shoppingagent.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token; // Access Token (cho backward compatibility)
    private String accessToken;
    private String refreshToken;
    private Long expiresIn;
    @Builder.Default
    private String tokenType = "Bearer";
    private UserSummary user;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private Integer id;
        private String username;
        private String email;
        private String displayName;
        private String role;
        private Boolean isActive;
    }
}

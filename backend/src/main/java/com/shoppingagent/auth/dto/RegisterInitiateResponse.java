package com.shoppingagent.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterInitiateResponse {
    private String message;
    private String email;
    private Integer expiresInSeconds;
    private Integer cooldownSeconds;
}

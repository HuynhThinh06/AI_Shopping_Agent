package com.shoppingagent.favorite.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToggleFavoriteRequest {
    private String userEmail;
    private Integer userId;

    @NotNull(message = "productId must not be null")
    private Long productId;
}

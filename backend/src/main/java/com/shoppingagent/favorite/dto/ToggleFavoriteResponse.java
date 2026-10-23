package com.shoppingagent.favorite.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToggleFavoriteResponse {
    private Long productId;
    private boolean isFavorite;
    private String message;
}

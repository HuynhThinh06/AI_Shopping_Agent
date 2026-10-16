package com.shoppingagent.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReviewDTO {
    private Long id;
    private Long productId;
    private String productName;
    private String reviewerName;
    private Short rating;
    private String content;
    private Boolean isSpam;
    private Boolean isActive;
    private LocalDateTime createdAt;
}

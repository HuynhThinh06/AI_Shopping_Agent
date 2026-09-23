package com.shoppingagent.review.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * DTO trả về thông tin một review cho client.
 * Dùng cho cả 2 trường hợp: lấy danh sách và tạo review mới.
 */
@Getter
@Builder
public class ReviewResponseDTO {

    private Long          id;
    private Long          productId;
    private String        reviewerName;
    private String        content;
    private Short         rating;
    private Boolean       isSpam;
    private LocalDateTime createdAt;
}

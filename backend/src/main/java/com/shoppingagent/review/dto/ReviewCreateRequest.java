package com.shoppingagent.review.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO nhận request tạo review mới từ client.
 * Các annotation @Constraint sẽ được kích hoạt khi Controller dùng @Valid.
 */
@Getter
@Setter
public class ReviewCreateRequest {

    /**
     * Tên người đánh giá — không bắt buộc.
     * Nếu null hoặc blank → ReviewService tự gán "Khách hàng ẩn danh".
     */
    private String reviewerName;

    @NotBlank(message = "Nội dung review không được để trống")
    @Size(min = 5, max = 2000, message = "Nội dung review phải từ 5 đến 2000 ký tự")
    private String content;

    @NotNull(message = "Số sao đánh giá không được để trống")
    @Min(value = 1, message = "Đánh giá tối thiểu 1 sao")
    @Max(value = 5, message = "Đánh giá tối đa 5 sao")
    private Short rating;
}

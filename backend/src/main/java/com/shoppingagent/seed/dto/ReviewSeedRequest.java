package com.shoppingagent.seed.dto;

import lombok.Data;

@Data
public class ReviewSeedRequest {
    private String reviewerName;
    private String content;
    private Short rating;
}

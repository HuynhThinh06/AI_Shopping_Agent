package com.shoppingagent.shared.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "reviewer_name", length = 255)
    private String reviewerName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /** Điểm đánh giá 1–5 */
    @Column
    private Short rating;

    /** TRUE nếu là review rác (spam, vô nghĩa) */
    @Builder.Default
    @Column(name = "is_spam")
    private Boolean isSpam = false;

    /** Soft delete — loại khỏi avg_rating và luồng AI */
    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

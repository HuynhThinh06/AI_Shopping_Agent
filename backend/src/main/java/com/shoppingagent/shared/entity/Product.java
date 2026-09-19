package com.shoppingagent.shared.entity;

import com.shoppingagent.shared.config.JsonbConverter;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "products")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(unique = true, length = 100)
    private String sku;

    @Column(nullable = false, length = 500)
    private String name;

    @Column(length = 100)
    private String brand;

    /** Giá sản phẩm tính bằng VNĐ */
    @Column(nullable = false)
    private Long price;

    @Column(name = "product_url", columnDefinition = "TEXT")
    private String productUrl;

    @Column(name = "avg_rating", columnDefinition = "numeric(3,2)")
    private BigDecimal avgRating;

    @Builder.Default
    @Column(name = "review_count")
    private Integer reviewCount = 0;

    /**
     * Thông số kỹ thuật dạng JSONB, vd: {"ram": 16, "cpu": "i5-1235U"}
     * Khóa phải khớp với category_attributes.attribute_key
     */
    @JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> specs;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
    private List<Review> reviews;

    @OneToOne(mappedBy = "product", fetch = FetchType.LAZY)
    private ReviewSummary reviewSummary;

    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<ProductImage> images;
}

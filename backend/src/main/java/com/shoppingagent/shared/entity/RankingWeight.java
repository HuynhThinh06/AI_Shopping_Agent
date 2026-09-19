package com.shoppingagent.shared.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "ranking_weights")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RankingWeight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    /** price / rating / spec_match */
    @Column(nullable = false, length = 50)
    private String criteria;

    /**
     * Giá trị 0.00 – 1.00.
     * Dùng BigDecimal để khớp với DECIMAL(4,2) trong DB.
     * Hibernate 7 không cho phép precision/scale trên kiểu Double/Float.
     */
    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal weight;
}

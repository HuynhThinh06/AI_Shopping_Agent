package com.shoppingagent.shared.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "category_attributes")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CategoryAttribute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    /** Khớp key trong products.specs, vd: ram */
    @Column(name = "attribute_key", nullable = false, length = 100)
    private String attributeKey;

    /** Nhãn hiển thị, vd: RAM */
    @Column(name = "attribute_label", nullable = false, length = 255)
    private String attributeLabel;

    /** Đơn vị, vd: GB, mAh */
    @Column(length = 50)
    private String unit;

    /** number / text / boolean */
    @Column(name = "data_type", nullable = false, length = 20)
    private String dataType;

    /** TRUE: bắn vào prompt LLM để trích xuất điều kiện lọc */
    @Builder.Default
    @Column(name = "is_filterable")
    private Boolean isFilterable = true;

    @Column(name = "display_order")
    private Integer displayOrder;
}

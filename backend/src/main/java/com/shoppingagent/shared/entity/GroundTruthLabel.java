package com.shoppingagent.shared.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ground_truth_labels", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"query_id", "product_id"})
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class GroundTruthLabel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "query_id", nullable = false)
    private SearchQuery query;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "is_relevant", nullable = false)
    private Boolean isRelevant;
}

package com.shoppingagent.shared.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "search_results")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SearchResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "query_id", nullable = false)
    private SearchQuery searchQuery;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "rank_position", nullable = false)
    private Integer rankPosition;

    @Column(nullable = false, columnDefinition = "float8")
    private Double score;
}

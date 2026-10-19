package com.shoppingagent.product;

import com.shoppingagent.shared.entity.CategoryAttribute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryAttributeRepository extends JpaRepository<CategoryAttribute, Integer> {

    List<CategoryAttribute> findByCategoryIdOrderByDisplayOrderAscIdAsc(Integer categoryId);

    Optional<CategoryAttribute> findByCategoryIdAndAttributeKeyIgnoreCase(Integer categoryId, String attributeKey);
}

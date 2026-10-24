package com.shoppingagent.admin.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateWeightsRequest {
    private Map<String, Double> weights;

    @JsonAnySetter
    public void setDynamicWeight(String key, Object value) {
        if (this.weights == null) {
            this.weights = new HashMap<>();
        }
        if (value instanceof Number num) {
            this.weights.put(key, num.doubleValue());
        }
    }
}

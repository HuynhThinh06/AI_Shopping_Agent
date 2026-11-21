package com.shoppingagent.shared.llm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shoppingagent.admin.LlmRequestLogRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
@DisplayName("GeminiClient — Kiểm thử schema động buildCriteriaSchema cho Structured Output")
class GeminiClientTest {

    @Mock
    private EntityManager entityManager;

    @Mock
    private LlmRequestLogRepository llmRequestLogRepository;

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("buildCriteriaSchema — Sinh requiredSpecs.properties không rỗng chứa filterableAttributes và fallback keys")
    void shouldBuildNonEmptyRequiredSpecsSchemaWithAttributesAndFallbacks() {
        GeminiClient client = new GeminiClient(new ObjectMapper(), entityManager, llmRequestLogRepository);

        Map<String, Object> schema = client.buildCriteriaSchema(List.of("cpu", "ram", "storage", "custom_port"));

        assertThat(schema).containsEntry("type", "object");
        Map<String, Object> props = (Map<String, Object>) schema.get("properties");
        assertThat(props).containsKeys("reasoning", "categoryCode", "requiredSpecs", "weightPrice", "weightRating", "weightSpec");

        Map<String, Object> requiredSpecsSchema = (Map<String, Object>) props.get("requiredSpecs");
        assertThat(requiredSpecsSchema).containsEntry("type", "object");
        assertThat(requiredSpecsSchema).doesNotContainKey("required");

        Map<String, Object> specProps = (Map<String, Object>) requiredSpecsSchema.get("properties");
        assertThat(specProps).isNotEmpty();
        assertThat(specProps).containsKeys("cpu", "ram", "storage", "custom_port", "refresh_rate", "vga", "battery", "chipset", "camera");

        Map<String, Object> ramProp = (Map<String, Object>) specProps.get("ram");
        assertThat(ramProp).containsEntry("type", "string").containsEntry("nullable", true);
    }

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("buildCriteriaSchema — Vẫn sinh properties hợp lệ khi filterableAttributes rỗng hoặc null")
    void shouldHandleEmptyOrNullFilterableAttributesGracefully() {
        GeminiClient client = new GeminiClient(new ObjectMapper(), entityManager, llmRequestLogRepository);

        for (List<String> input : new List[]{Collections.emptyList(), null}) {
            Map<String, Object> schema = client.buildCriteriaSchema(input);
            Map<String, Object> props = (Map<String, Object>) schema.get("properties");
            Map<String, Object> requiredSpecsSchema = (Map<String, Object>) props.get("requiredSpecs");
            Map<String, Object> specProps = (Map<String, Object>) requiredSpecsSchema.get("properties");
            assertThat(specProps).isNotEmpty();
            assertThat(specProps).containsKeys("ram", "storage", "battery", "cpu", "vga", "refresh_rate");
        }
    }
}

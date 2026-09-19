package com.shoppingagent.shared.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI shoppingAgentOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AI Shopping Agent API")
                        .description("Trợ lý tư vấn mua sắm thông minh — Đồ án 1 UIT 2026")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Huỳnh Gia Thịnh & Nguyễn Hữu Tính")
                                .email("24521680@gm.uit.edu.vn")));
    }
}

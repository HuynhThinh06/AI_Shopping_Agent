package com.shoppingagent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class ShoppingAgentApplication {

    public static void main(String[] args) {
        SpringApplication.run(ShoppingAgentApplication.class, args);
    }

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void printSwaggerUrl() {
        System.out.println("\n---------------------------------------------------------");
        System.out.println("Backend đã khởi động thành công!");
        System.out.println("CLICK VÀO ĐÂY ĐỂ TEST SWAGGER: http://localhost:8080/api/swagger-ui.html");
        System.out.println("---------------------------------------------------------\n");
    }
}

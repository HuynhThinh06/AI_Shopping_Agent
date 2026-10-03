package com.shoppingagent.shared.llm;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;

/**
 * Global Exception Handler bắt và xử lý các ngoại lệ liên quan đến LLM.
 * Chuẩn hóa lỗi theo định dạng RFC 7807 (ProblemDetail).
 */
@Slf4j
@RestControllerAdvice
public class LlmExceptionHandler {

    @ExceptionHandler(LlmCallException.class)
    public ProblemDetail handleLlmCallException(LlmCallException ex) {
        log.error("[LlmExceptionHandler] LLM call failed: {}", ex.getMessage(), ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_GATEWAY,
                "Dịch vụ AI tạm thời không phản hồi hoặc đã quá số lần thử lại (retry). Vui lòng thử lại sau."
        );
        problem.setType(URI.create("https://shoppingagent.local/errors/llm-call-failed"));
        problem.setTitle("LLM Gateway Error");
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("retryable", true);
        return problem;
    }

    @ExceptionHandler(LlmParseException.class)
    public ProblemDetail handleLlmParseException(LlmParseException ex) {
        log.error("[LlmExceptionHandler] LLM parse response failed: {}", ex.getMessage(), ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Không thể xử lý phản hồi có cấu trúc từ AI."
        );
        problem.setType(URI.create("https://shoppingagent.local/errors/llm-parse-failed"));
        problem.setTitle("LLM Parse Error");
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("retryable", false);
        return problem;
    }
}

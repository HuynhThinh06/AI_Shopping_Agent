package com.shoppingagent.shared.config;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
@Order(Ordered.LOWEST_PRECEDENCE)
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public void handleAccessDenied(AccessDeniedException ex) {
        throw ex; // Để Spring Security AccessDeniedHandler xử lý trả về 403
    }

    @ExceptionHandler(AuthenticationException.class)
    public void handleAuthentication(AuthenticationException ex) {
        throw ex; // Để Spring Security AuthenticationEntryPoint xử lý trả về 401
    }

    @ExceptionHandler(com.shoppingagent.product.ProductNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleProductNotFound(com.shoppingagent.product.ProductNotFoundException ex) {
        log.warn("[GlobalExceptionHandler] ProductNotFound: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "Yêu cầu không hợp lệ";
        boolean isNotFound = msg.toLowerCase().contains("không tìm thấy") 
                || msg.toLowerCase().contains("not found");
        
        HttpStatus status = isNotFound ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
        log.warn("[GlobalExceptionHandler] IllegalArgument ({}): {}", status.value(), msg);
        return buildResponse(status, isNotFound ? "Not Found" : "Bad Request", msg);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "Trạng thái không hợp lệ";
        log.warn("[GlobalExceptionHandler] IllegalState: {}", msg);
        return buildResponse(HttpStatus.BAD_REQUEST, "Bad Request", msg);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String details = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> String.format("%s: %s", err.getField(), err.getDefaultMessage()))
                .collect(Collectors.joining("; "));
        
        String msg = details.isBlank() ? "Dữ liệu gửi lên không đúng định dạng" : details;
        log.warn("[GlobalExceptionHandler] MethodArgumentNotValid: {}", msg);
        return buildResponse(HttpStatus.BAD_REQUEST, "Validation Error", msg);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException ex) {
        String msg = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining("; "));
        log.warn("[GlobalExceptionHandler] ConstraintViolation: {}", msg);
        return buildResponse(HttpStatus.BAD_REQUEST, "Validation Error", msg);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(MissingServletRequestParameterException ex) {
        String msg = "Thiếu tham số bắt buộc: " + ex.getParameterName();
        return buildResponse(HttpStatus.BAD_REQUEST, "Bad Request", msg);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String msg = String.format("Tham số '%s' có giá trị không hợp lệ", ex.getName());
        return buildResponse(HttpStatus.BAD_REQUEST, "Bad Request", msg);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE, "Payload Too Large", "Kích thước tập tin vượt quá giới hạn cho phép");
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(org.springframework.dao.DataIntegrityViolationException ex) {
        log.warn("[GlobalExceptionHandler] DataIntegrityViolation: {}", ex.getMessage());
        String msg = "Dữ liệu bị trùng lặp (ví dụ mã SKU) hoặc vi phạm ràng buộc toàn vẹn cơ sở dữ liệu.";
        return buildResponse(HttpStatus.CONFLICT, "Conflict", msg);
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, "Not Found", "Tài nguyên yêu cầu không tồn tại trên hệ thống");
    }

    @ExceptionHandler(com.shoppingagent.shared.exception.TooManyRequestsException.class)
    public ResponseEntity<Map<String, Object>> handleTooManyRequests(com.shoppingagent.shared.exception.TooManyRequestsException ex) {
        log.warn("[GlobalExceptionHandler] TooManyRequests: {}", ex.getMessage());
        return buildResponse(HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests", ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        log.error("[GlobalExceptionHandler] Unhandled exception: {}", ex.getMessage(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", 
                "Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.");
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String error, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        body.put("timestamp", LocalDateTime.now());
        return ResponseEntity.status(status).body(body);
    }
}

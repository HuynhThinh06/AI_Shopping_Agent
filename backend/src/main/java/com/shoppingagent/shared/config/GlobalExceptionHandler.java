package com.shoppingagent.shared.config;

import com.shoppingagent.product.ProductNotFoundException;
import com.shoppingagent.shared.exception.TooManyRequestsException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Bộ xử lý ngoại lệ toàn cục (Global Exception Handler).
 * Tiếp nhận và chuẩn hóa các lỗi nghiệp vụ, bảo mật, xác thực dữ liệu và hệ thống.
 */
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

    @ExceptionHandler(ProductNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleProductNotFound(ProductNotFoundException ex) {
        log.warn("[GlobalExceptionHandler] ProductNotFound: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage(), null);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "Yêu cầu không hợp lệ";
        boolean isNotFound = msg.toLowerCase().contains("không tìm thấy") 
                || msg.toLowerCase().contains("not found");
        
        HttpStatus status = isNotFound ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
        log.warn("[GlobalExceptionHandler] IllegalArgument ({}): {}", status.value(), msg);

        String code = null;
        if (msg.contains("Email đã được đăng ký")) {
            code = "DUPLICATE_EMAIL";
        } else if (msg.contains("Tên đăng nhập đã tồn tại")) {
            code = "DUPLICATE_USERNAME";
        }

        return buildResponse(status, isNotFound ? "Not Found" : "Bad Request", msg, code);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "Trạng thái không hợp lệ";
        log.warn("[GlobalExceptionHandler] IllegalState: {}", msg);

        boolean isForbidden = msg.toLowerCase().contains("bị khóa") || msg.toLowerCase().contains("khóa");
        HttpStatus status = isForbidden ? HttpStatus.FORBIDDEN : HttpStatus.BAD_REQUEST;
        return buildResponse(status, isForbidden ? "Forbidden" : "Bad Request", msg, null);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleSecurityException(SecurityException ex) {
        log.warn("[GlobalExceptionHandler] SecurityException: {}", ex.getMessage());
        return buildResponse(HttpStatus.UNAUTHORIZED, "Security Exception", ex.getMessage(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String details = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> String.format("%s: %s", err.getField(), err.getDefaultMessage()))
                .collect(Collectors.joining("; "));
        
        String msg = details.isBlank() ? "Dữ liệu gửi lên không đúng định dạng" : details;
        log.warn("[GlobalExceptionHandler] MethodArgumentNotValid: {}", msg);
        return buildResponse(HttpStatus.BAD_REQUEST, "Validation Error", msg, null);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException ex) {
        String msg = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining("; "));
        log.warn("[GlobalExceptionHandler] ConstraintViolation: {}", msg);
        return buildResponse(HttpStatus.BAD_REQUEST, "Validation Error", msg, null);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(MissingServletRequestParameterException ex) {
        String msg = "Thiếu tham số bắt buộc: " + ex.getParameterName();
        return buildResponse(HttpStatus.BAD_REQUEST, "Bad Request", msg, null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String msg = String.format("Tham số '%s' có giá trị không hợp lệ", ex.getName());
        return buildResponse(HttpStatus.BAD_REQUEST, "Bad Request", msg, null);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE, "Payload Too Large", "Kích thước tập tin vượt quá giới hạn cho phép", null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("[GlobalExceptionHandler] DataIntegrityViolation: {}", ex.getMessage());
        String msg = "Dữ liệu bị trùng lặp (ví dụ mã SKU) hoặc vi phạm ràng buộc toàn vẹn cơ sở dữ liệu.";
        return buildResponse(HttpStatus.CONFLICT, "Conflict", msg, null);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFound(NoResourceFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, "Not Found", "Tài nguyên yêu cầu không tồn tại trên hệ thống", null);
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<Map<String, Object>> handleTooManyRequests(TooManyRequestsException ex) {
        log.warn("[GlobalExceptionHandler] TooManyRequests: {}", ex.getMessage());
        return buildResponse(HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests", ex.getMessage(), null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        log.error("[GlobalExceptionHandler] Unhandled exception: {}", ex.getMessage(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", 
                "Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.", null);
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String error, String message, String code) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        body.put("timestamp", LocalDateTime.now());
        if (code != null) {
            body.put("code", code);
        }
        return ResponseEntity.status(status).body(body);
    }
}

package com.shoppingagent.shared.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service quản lý giới hạn tần suất (Sliding-Window Rate Limiter) trên bộ nhớ RAM.
 * Dùng để phòng chống tấn công dò mật khẩu (Brute Force / Dictionary Attack) và spam request.
 */
@Slf4j
@Service
public class RateLimiterService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long WINDOW_MS = 60_000L; // 1 phút (60 giây)

    private final Map<String, Deque<Long>> attemptStore = new ConcurrentHashMap<>();

    /**
     * Kiểm tra xem IP/key này có đang bị chặn do vượt quá số lần thử hay không.
     */
    public boolean isRateLimited(String key) {
        if (key == null || key.isBlank()) return false;
        long now = System.currentTimeMillis();

        Deque<Long> timestamps = attemptStore.get(key);
        if (timestamps == null) return false;

        synchronized (timestamps) {
            // Loại bỏ các mốc thời gian ngoài cửa sổ trượt
            while (!timestamps.isEmpty() && (now - timestamps.peekFirst()) > WINDOW_MS) {
                timestamps.pollFirst();
            }
            return timestamps.size() >= MAX_FAILED_ATTEMPTS;
        }
    }

    /**
     * Ghi nhận một lần thử thất bại
     */
    public void recordFailedAttempt(String key) {
        if (key == null || key.isBlank()) return;
        long now = System.currentTimeMillis();

        Deque<Long> timestamps = attemptStore.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            // Dọn dẹp bản ghi cũ
            while (!timestamps.isEmpty() && (now - timestamps.peekFirst()) > WINDOW_MS) {
                timestamps.pollFirst();
            }
            timestamps.addLast(now);
            log.warn("[RateLimiter] Key '{}' recorded failed attempt ({}/{})", key, timestamps.size(), MAX_FAILED_ATTEMPTS);
        }
    }

    /**
     * Xóa sạch lịch sử thất bại khi đăng nhập thành công
     */
    public void reset(String key) {
        if (key != null) {
            attemptStore.remove(key);
        }
    }

    /**
     * Lấy số giây còn lại cần chờ trước khi thử lại
     */
    public long getRemainingSeconds(String key) {
        if (key == null) return 0;
        Deque<Long> timestamps = attemptStore.get(key);
        if (timestamps == null || timestamps.isEmpty()) return 0;

        synchronized (timestamps) {
            Long oldest = timestamps.peekFirst();
            if (oldest == null) return 0;
            long elapsed = System.currentTimeMillis() - oldest;
            return Math.max(1, (WINDOW_MS - elapsed) / 1000);
        }
    }
}

package com.shoppingagent.shared.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DatabaseKeepAliveService {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Ping database mỗi 2.5 phút (150 giây) để giữ kết nối Neon Serverless luôn ấm (Warm state),
     * triệt tiêu hoàn toàn độ trễ khởi động lạnh (Cold-Start Latency 3-5s).
     */
    @Scheduled(fixedRate = 150000, initialDelay = 30000)
    public void keepDatabaseWarm() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            log.debug("[Neon Warm-KeepAlive] Database connection pinged successfully.");
        } catch (Exception e) {
            log.warn("[Neon Warm-KeepAlive] Ping failed: {}", e.getMessage());
        }
    }
}

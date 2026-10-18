-- =============================================================
--  AI Shopping Agent — Seed User Accounts for Testing
--  Target: PostgreSQL 16+ (Neon Serverless PostgreSQL)
-- =============================================================

BEGIN;

INSERT INTO "users" ("id", "username", "email", "password_hash", "display_name", "role", "is_active", "created_at", "updated_at")
VALUES
  -- 1. Crawler hệ thống (dùng lưu review cào từ web)
  (1, 'crawler', 'crawler@system.local', 'N/A', 'System Crawler', 'admin', TRUE, NOW(), NOW()),
  
  -- 2. Quản trị viên (Test luồng Admin Dashboard, Benchmark GIN, LLM Logs, Weights)
  (2, 'admin', 'admin@shoppingagent.com', '$2a$10$w8T0pC0sJpUjV/y6aJm6E.b9V7H9pI1jD8kF2lM4nO5pQ6rS7tU8v', 'Quản trị viên Hệ thống (Admin)', 'admin', TRUE, NOW(), NOW()),
  
  -- 3. Khách hàng VIP (Trần Tuấn Anh - Khớp nút 1-Click Login trên AuthPage)
  (3, 'tuananh', 'tuananh.dev@gmail.com', '$2a$10$G8w9v5b5e3d2c1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2', 'Trần Tuấn Anh (VIP)', 'user', TRUE, NOW(), NOW()),
  
  -- 4. Sinh viên IT (Huỳnh Gia Thịnh - Test query học IT, ngân sách sinh viên 15tr)
  (4, 'giathinh', 'giathinh.student@hcmut.edu.vn', '$2a$10$G8w9v5b5e3d2c1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2', 'Huỳnh Gia Thịnh (Sinh viên IT)', 'user', TRUE, NOW(), NOW()),
  
  -- 5. Tech Reviewer & Gamer (Hoàng Minh - Test specs-first, so sánh cấu hình khủng)
  (5, 'hoangminh', 'hoangminh.tech@gmail.com', '$2a$10$G8w9v5b5e3d2c1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2', 'Hoàng Minh (Tech Reviewer / Gamer)', 'user', TRUE, NOW(), NOW()),
  
  -- 6. Nhân viên Văn phòng (Nguyễn Lan Anh - Test ultrabook nhẹ, pin trâu, điện thoại)
  (6, 'lananh', 'lananh.office@company.vn', '$2a$10$G8w9v5b5e3d2c1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2', 'Nguyễn Lan Anh (Văn phòng)', 'user', TRUE, NOW(), NOW()),
  
  -- 7. Chuyên gia Đánh giá (Trần Quốc Khánh - Test đăng review đóng góp AI Cache)
  (7, 'khanh_reviewer', 'khanh.reviewer@techlab.vn', '$2a$10$G8w9v5b5e3d2c1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2', 'Trần Quốc Khánh (Chuyên gia Đánh giá)', 'user', TRUE, NOW(), NOW()),
  
  -- 8. Tài khoản Spam Bot (Test bộ lọc Spam 7 tiêu chí & Invalidation Cache)
  (8, 'spammer_bot', 'spambot999@disposable.org', '$2a$10$G8w9v5b5e3d2c1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2', 'Dịch vụ Quảng cáo 247 (Spam Bot)', 'user', FALSE, NOW(), NOW())
ON CONFLICT (username) DO UPDATE
SET email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Cập nhật sequence users_id_seq tránh conflict ID khi đăng ký mới
SELECT setval('users_id_seq', (SELECT GREATEST(MAX(id), 8) FROM "users"));

COMMIT;

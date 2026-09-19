-- =============================================================
--  AI Shopping Agent — PostgreSQL Schema
--  Phiên bản: 2.0 (đã sửa lỗi FK, seed id, bổ sung log columns)
--  Target: PostgreSQL 16+
-- =============================================================

-- -------------------------------------------------------------
-- BẢNG 1: categories
-- Ngành hàng hệ thống hỗ trợ (laptop, phone, ...)
-- -------------------------------------------------------------
CREATE TABLE "categories" (
  "id"          SERIAL       PRIMARY KEY,
  "code"        VARCHAR(50)  UNIQUE NOT NULL,
  "name"        VARCHAR(255) NOT NULL,
  "description" TEXT,
  "is_active"   BOOLEAN      DEFAULT TRUE,
  "created_at"  TIMESTAMP    DEFAULT NOW(),
  "updated_at"  TIMESTAMP    DEFAULT NOW()
);

COMMENT ON TABLE  "categories"              IS 'Ngành hàng hệ thống hỗ trợ. Là bảng gốc, tránh lặp chuỗi category ở nhiều bảng.';
COMMENT ON COLUMN "categories"."code"       IS 'Mã định danh ngắn, vd: laptop, phone';
COMMENT ON COLUMN "categories"."name"       IS 'Tên hiển thị';
COMMENT ON COLUMN "categories"."updated_at" IS 'Spring Boot @UpdateTimestamp';

-- -------------------------------------------------------------
-- BẢNG 2: category_attributes
-- Khai báo động thuộc tính lọc/hiển thị theo từng ngành hàng
-- -------------------------------------------------------------
CREATE TABLE "category_attributes" (
  "id"              SERIAL       PRIMARY KEY,
  "category_id"     INTEGER      NOT NULL,
  "attribute_key"   VARCHAR(100) NOT NULL,
  "attribute_label" VARCHAR(255) NOT NULL,
  "unit"            VARCHAR(50),
  "data_type"       VARCHAR(20)  NOT NULL,
  "is_filterable"   BOOLEAN      DEFAULT TRUE,
  "display_order"   INTEGER
);

COMMENT ON TABLE  "category_attributes"                    IS 'Khai báo động thuộc tính theo từng ngành hàng, cho phép mở rộng không cần sửa code.';
COMMENT ON COLUMN "category_attributes"."attribute_key"   IS 'Khớp key trong products.specs, vd: ram';
COMMENT ON COLUMN "category_attributes"."attribute_label" IS 'Nhãn hiển thị, vd: RAM';
COMMENT ON COLUMN "category_attributes"."unit"            IS 'Đơn vị, vd: GB, mAh, Wh';
COMMENT ON COLUMN "category_attributes"."data_type"       IS 'number / text / boolean';
COMMENT ON COLUMN "category_attributes"."is_filterable"   IS 'TRUE: bắn vào prompt LLM để trích xuất điều kiện lọc';
COMMENT ON COLUMN "category_attributes"."display_order"   IS 'Thứ tự ưu tiên hiển thị trên UI';

-- -------------------------------------------------------------
-- BẢNG 3: ranking_weights
-- Trọng số Weighted Scoring riêng theo từng ngành hàng
-- -------------------------------------------------------------
CREATE TABLE "ranking_weights" (
  "id"          SERIAL        PRIMARY KEY,
  "category_id" INTEGER       NOT NULL,
  "criteria"    VARCHAR(50)   NOT NULL,
  "weight"      DECIMAL(4,2)  NOT NULL
);

COMMENT ON TABLE  "ranking_weights"            IS 'Bộ trọng số Weighted Scoring, cấu hình riêng theo từng ngành hàng.';
COMMENT ON COLUMN "ranking_weights"."criteria" IS 'price / rating / spec_match';
COMMENT ON COLUMN "ranking_weights"."weight"   IS 'Giá trị 0.00 – 1.00; tổng các criteria trong 1 category phải = 1.00';

-- -------------------------------------------------------------
-- BẢNG 4: products
-- Bảng trung tâm, chứa tất cả sản phẩm mọi ngành hàng
-- -------------------------------------------------------------
CREATE TABLE "products" (
  "id"           SERIAL        PRIMARY KEY,
  "category_id"  INTEGER       NOT NULL,
  "sku"          VARCHAR(100)  UNIQUE,
  "name"         VARCHAR(500)  NOT NULL,
  "brand"        VARCHAR(100),
  "price"        BIGINT        NOT NULL CHECK ("price" >= 0),
  "product_url"  TEXT,
  "avg_rating"   DECIMAL(3,2)  CHECK ("avg_rating" >= 0 AND "avg_rating" <= 5),
  "review_count" INTEGER       DEFAULT 0,
  "specs"        JSONB         NOT NULL DEFAULT '{}',
  "is_active"    BOOLEAN       DEFAULT TRUE,
  "created_at"   TIMESTAMP     DEFAULT NOW(),
  "updated_at"   TIMESTAMP     DEFAULT NOW()
);

COMMENT ON TABLE  "products"               IS 'Bảng trung tâm, lưu mọi sản phẩm thuộc mọi ngành hàng (laptop + điện thoại).';
COMMENT ON COLUMN "products"."sku"         IS 'Mã định danh sản phẩm. Có thể NULL nếu nguồn không cung cấp';
COMMENT ON COLUMN "products"."price"       IS 'Đơn vị VNĐ, >= 0. Dùng BIGINT tránh sai số thập phân';
COMMENT ON COLUMN "products"."product_url" IS 'Link gốc để đối soát / gắn nút Mua ngay';
COMMENT ON COLUMN "products"."avg_rating"  IS 'Điểm trung bình 0.0 – 5.0';
COMMENT ON COLUMN "products"."specs"       IS 'Thông số riêng theo category, vd: {"ram":16,"cpu":"i5-1235U","storage":512}';
COMMENT ON COLUMN "products"."is_active"   IS 'Soft delete';
COMMENT ON COLUMN "products"."updated_at"  IS 'Spring Boot @UpdateTimestamp';

-- -------------------------------------------------------------
-- BẢNG 5: product_images
-- Ảnh sản phẩm (1 sản phẩm có nhiều ảnh)
-- -------------------------------------------------------------
CREATE TABLE "product_images" (
  "id"         SERIAL   PRIMARY KEY,
  "product_id" INTEGER  NOT NULL,
  "image_url"  TEXT     NOT NULL,
  "is_primary" BOOLEAN  DEFAULT FALSE
);

-- -------------------------------------------------------------
-- BẢNG 6: reviews
-- Đánh giá của người dùng về sản phẩm
-- -------------------------------------------------------------
CREATE TABLE "reviews" (
  "id"            SERIAL       PRIMARY KEY,
  "product_id"    INTEGER      NOT NULL,
  "reviewer_name" VARCHAR(255),
  "content"       TEXT         NOT NULL,
  "rating"        SMALLINT     CHECK ("rating" >= 1 AND "rating" <= 5),
  "is_spam"       BOOLEAN      DEFAULT FALSE,
  "is_active"     BOOLEAN      DEFAULT TRUE,
  "created_at"    TIMESTAMP    DEFAULT NOW(),
  "updated_at"    TIMESTAMP    DEFAULT NOW()
);

COMMENT ON COLUMN "reviews"."rating"   IS 'Điểm đánh giá 1 – 5';
COMMENT ON COLUMN "reviews"."is_spam"  IS 'Đánh dấu sau bước lọc review rác, loại khỏi input LLM tóm tắt';
COMMENT ON COLUMN "reviews"."is_active" IS 'Soft delete — loại khỏi avg_rating và luồng AI';
COMMENT ON COLUMN "reviews"."updated_at" IS 'Spring Boot @UpdateTimestamp';

-- -------------------------------------------------------------
-- BẢNG 7: review_summaries
-- Cache kết quả tóm tắt review do LLM sinh ra (quan hệ 1-1 với products)
-- -------------------------------------------------------------
CREATE TABLE "review_summaries" (
  "product_id"               INTEGER   PRIMARY KEY,
  "summary_text"             TEXT,
  "pros"                     TEXT,
  "cons"                     TEXT,
  "llm_model_used"           VARCHAR(100),
  "review_count_at_generate" INTEGER,
  "generated_at"             TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE  "review_summaries"                            IS 'Cache kết quả tóm tắt review do LLM sinh ra, tránh gọi API lặp lại.';
COMMENT ON COLUMN "review_summaries"."product_id"               IS 'Vừa là PK vừa là FK → products.id (quan hệ 1-1 optional)';
COMMENT ON COLUMN "review_summaries"."pros"                     IS 'Danh sách ưu điểm LLM tổng hợp';
COMMENT ON COLUMN "review_summaries"."cons"                     IS 'Danh sách nhược điểm LLM tổng hợp';
COMMENT ON COLUMN "review_summaries"."review_count_at_generate" IS 'So sánh với products.review_count để quyết định có cần gọi LLM tóm tắt lại không';

-- -------------------------------------------------------------
-- BẢNG 8: users
-- Tài khoản người dùng hệ thống
-- -------------------------------------------------------------
CREATE TABLE "users" (
  "id"            SERIAL        PRIMARY KEY,
  "username"      VARCHAR(100)  UNIQUE NOT NULL,
  "email"         VARCHAR(255)  UNIQUE NOT NULL,
  "password_hash" VARCHAR(255)  NOT NULL,
  "display_name"  VARCHAR(255),
  "role"          VARCHAR(20)   NOT NULL DEFAULT 'user',
  "is_active"     BOOLEAN       DEFAULT TRUE,
  "created_at"    TIMESTAMP     DEFAULT NOW(),
  "updated_at"    TIMESTAMP     DEFAULT NOW()
);

COMMENT ON COLUMN "users"."display_name" IS 'Tên hiển thị trên UI, vd: Gia Thịnh';
COMMENT ON COLUMN "users"."role"         IS 'user hoặc admin';
COMMENT ON COLUMN "users"."is_active"    IS 'Soft delete / Khóa tài khoản';
COMMENT ON COLUMN "users"."updated_at"   IS 'Spring Boot @UpdateTimestamp';

-- -------------------------------------------------------------
-- BẢNG 9: user_favorites
-- Sản phẩm yêu thích của người dùng (N-N)
-- -------------------------------------------------------------
CREATE TABLE "user_favorites" (
  "id"         SERIAL    PRIMARY KEY,
  "user_id"    INTEGER   NOT NULL,
  "product_id" INTEGER   NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- -------------------------------------------------------------
-- BẢNG 10: search_queries
-- Lịch sử truy vấn tìm kiếm (cả khách và user đăng nhập)
-- -------------------------------------------------------------
CREATE TABLE "search_queries" (
  "id"                  SERIAL    PRIMARY KEY,
  "user_id"             INTEGER,
  "session_id"          VARCHAR(100),
  "query_text"          TEXT      NOT NULL,
  "category_detected_id" INTEGER,
  "extracted_criteria"  JSONB,
  "is_test_query"       BOOLEAN   DEFAULT FALSE,
  "created_at"          TIMESTAMP DEFAULT NOW()
);

COMMENT ON COLUMN "search_queries"."user_id"              IS 'NULL nếu khách vãng lai chưa đăng nhập';
COMMENT ON COLUMN "search_queries"."session_id"           IS 'Định danh phiên cho khách chưa đăng nhập';
COMMENT ON COLUMN "search_queries"."category_detected_id" IS 'Ngành hàng LLM tự phân loại từ câu truy vấn';
COMMENT ON COLUMN "search_queries"."extracted_criteria"   IS 'Ràng buộc LLM trích xuất, vd: {"budget":20000000,"ram":16}';
COMMENT ON COLUMN "search_queries"."is_test_query"        IS 'TRUE nếu thuộc bộ 30-50 câu kiểm thử Ground Truth';

-- -------------------------------------------------------------
-- BẢNG 11: search_results
-- Kết quả xếp hạng trả về cho mỗi truy vấn (N-N)
-- -------------------------------------------------------------
CREATE TABLE "search_results" (
  "id"            SERIAL        PRIMARY KEY,
  "query_id"      INTEGER       NOT NULL,
  "product_id"    INTEGER       NOT NULL,
  "rank_position" SMALLINT      NOT NULL,
  "score"         DECIMAL(6,4)  NOT NULL
);

COMMENT ON TABLE "search_results" IS 'Sản phẩm nào được trả về cho truy vấn nào, hạng mấy, điểm tổng hợp bao nhiêu.';

-- -------------------------------------------------------------
-- BẢNG 12: ground_truth_labels
-- Nhãn đúng/sai do người gán tay — dùng tính Precision/Recall
-- -------------------------------------------------------------
CREATE TABLE "ground_truth_labels" (
  "id"          SERIAL   PRIMARY KEY,
  "query_id"    INTEGER  NOT NULL,
  "product_id"  INTEGER  NOT NULL,
  "is_relevant" BOOLEAN  NOT NULL
);

COMMENT ON TABLE "ground_truth_labels" IS 'Nhãn đúng/sai do người gán tay cho bộ truy vấn kiểm thử, dùng tính Precision/Recall.';

-- -------------------------------------------------------------
-- BẢNG 13: llm_request_logs
-- Log toàn bộ request/response gọi LLM API
-- -------------------------------------------------------------
CREATE TABLE "llm_request_logs" (
  "id"           SERIAL       PRIMARY KEY,
  "query_id"     INTEGER,
  "request_type" VARCHAR(50)  NOT NULL,
  "prompt_text"  TEXT,
  "response_text" TEXT,
  "status"       VARCHAR(20)  NOT NULL,
  "retry_count"  SMALLINT     DEFAULT 0,
  "latency_ms"   INTEGER,
  "tokens_used"  INTEGER,
  "created_at"   TIMESTAMP    DEFAULT NOW()
);

COMMENT ON COLUMN "llm_request_logs"."request_type" IS 'extract_query / summarize_review';
COMMENT ON COLUMN "llm_request_logs"."status"       IS 'success / failed / retried';
COMMENT ON COLUMN "llm_request_logs"."latency_ms"   IS 'Thời gian gọi LLM (ms), đo từ lúc gửi đến khi nhận response';
COMMENT ON COLUMN "llm_request_logs"."tokens_used"  IS 'Tổng số token tiêu thụ (Gemini trả về trong usageMetadata)';

-- =============================================================
-- INDEXES
-- =============================================================

-- category_attributes: mỗi ngành hàng không được có attribute_key trùng
CREATE UNIQUE INDEX ON "category_attributes" ("category_id", "attribute_key");

-- ranking_weights: mỗi ngành hàng không được có criteria trùng
CREATE UNIQUE INDEX ON "ranking_weights" ("category_id", "criteria");

-- products: composite index cho luồng lọc chính (category + giá)
CREATE INDEX ON "products" ("category_id", "price");

-- products: composite index bổ sung cho lọc + sắp xếp theo rating
CREATE INDEX ON "products" ("category_id", "is_active", "avg_rating" DESC, "price");

-- products: GIN index cho truy vấn jsonb specs (toán tử @>, ?, @?)
CREATE INDEX ON "products" USING GIN ("specs");

-- user_favorites: mỗi user chỉ favorite 1 sản phẩm 1 lần
CREATE UNIQUE INDEX ON "user_favorites" ("user_id", "product_id");

-- ground_truth_labels: mỗi cặp (query, product) chỉ có 1 nhãn
CREATE UNIQUE INDEX ON "ground_truth_labels" ("query_id", "product_id");

-- search_results: tra cứu nhanh kết quả theo query
CREATE INDEX ON "search_results" ("query_id");

-- llm_request_logs: tra cứu log theo query
CREATE INDEX ON "llm_request_logs" ("query_id");

-- =============================================================
-- FOREIGN KEYS
-- =============================================================

ALTER TABLE "products"
  ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "category_attributes"
  ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ranking_weights"
  ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "search_queries"
  ADD FOREIGN KEY ("category_detected_id") REFERENCES "categories" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_images"
  ADD FOREIGN KEY ("product_id") REFERENCES "products" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "reviews"
  ADD FOREIGN KEY ("product_id") REFERENCES "products" ("id") DEFERRABLE INITIALLY IMMEDIATE;

-- ✅ ĐÚNG CHIỀU: review_summaries → products (quan hệ 1-1 optional)
ALTER TABLE "review_summaries"
  ADD FOREIGN KEY ("product_id") REFERENCES "products" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "search_queries"
  ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_favorites"
  ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_favorites"
  ADD FOREIGN KEY ("product_id") REFERENCES "products" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "search_results"
  ADD FOREIGN KEY ("query_id") REFERENCES "search_queries" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "search_results"
  ADD FOREIGN KEY ("product_id") REFERENCES "products" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ground_truth_labels"
  ADD FOREIGN KEY ("query_id") REFERENCES "search_queries" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ground_truth_labels"
  ADD FOREIGN KEY ("product_id") REFERENCES "products" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "llm_request_logs"
  ADD FOREIGN KEY ("query_id") REFERENCES "search_queries" ("id") DEFERRABLE INITIALLY IMMEDIATE;

-- =============================================================
-- SEED DATA (dữ liệu khởi tạo mặc định)
-- =============================================================
BEGIN;
SET CONSTRAINTS ALL DEFERRED;

-- Ngành hàng
INSERT INTO "categories" ("id", "code", "name", "description") VALUES
  (1, 'laptop', 'Laptop',       'Máy tính xách tay các loại'),
  (2, 'phone',  'Điện thoại',   'Điện thoại thông minh');

-- Trọng số xếp hạng theo ngành hàng
-- Laptop: spec_match quan trọng hơn vì người mua thường quan tâm cấu hình
INSERT INTO "ranking_weights" ("category_id", "criteria", "weight") VALUES
  (1, 'price',      0.35),
  (1, 'spec_match', 0.45),
  (1, 'rating',     0.20),
  (2, 'price',      0.30),
  (2, 'spec_match', 0.40),
  (2, 'rating',     0.30);

-- Thuộc tính lọc theo ngành hàng
INSERT INTO "category_attributes" ("category_id", "attribute_key", "attribute_label", "unit", "data_type", "is_filterable", "display_order") VALUES
  -- Laptop
  (1, 'cpu',          'CPU',        NULL,  'text',   TRUE,  1),
  (1, 'ram',          'RAM',        'GB',  'number', TRUE,  2),
  (1, 'storage',      'Ổ cứng',     'GB',  'number', TRUE,  3),
  (1, 'battery',      'Pin',        'Wh',  'number', TRUE,  4),
  (1, 'screen_size',  'Màn hình',   'inch','number', TRUE,  5),
  (1, 'weight',       'Trọng lượng','kg',  'number', FALSE, 6),
  -- Điện thoại
  (2, 'chipset',      'Chipset',    NULL,  'text',   TRUE,  1),
  (2, 'ram',          'RAM',        'GB',  'number', TRUE,  2),
  (2, 'storage',      'Bộ nhớ',     'GB',  'number', TRUE,  3),
  (2, 'battery',      'Pin',        'mAh', 'number', TRUE,  4),
  (2, 'screen_size',  'Màn hình',   'inch','number', TRUE,  5),
  (2, 'camera',       'Camera sau', 'MP',  'number', FALSE, 6);

-- Tài khoản admin mặc định (password_hash cần được set lại khi deploy)
INSERT INTO "users" ("id", "username", "email", "password_hash", "display_name", "role") VALUES
  (1, 'admin', 'admin@shoppingagent.local', 'CHANGE_ME_BEFORE_DEPLOY', 'Administrator', 'admin');

-- Reset sequence về đúng vị trí sau khi insert thủ công
SELECT setval('categories_id_seq',         (SELECT MAX(id) FROM "categories"));
SELECT setval('ranking_weights_id_seq',     (SELECT MAX(id) FROM "ranking_weights"));
SELECT setval('category_attributes_id_seq', (SELECT MAX(id) FROM "category_attributes"));
SELECT setval('users_id_seq',               (SELECT MAX(id) FROM "users"));

SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;

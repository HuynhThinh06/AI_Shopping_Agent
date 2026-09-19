# 🛒 AI Shopping Agent — Trợ lý Tư vấn Mua sắm Thông minh

## 📖 Mô tả đề tài

Hệ thống **AI Shopping Agent** là một trợ lý tư vấn mua sắm thông minh, giải quyết bài toán "quá tải thông tin" trên các sàn thương mại điện tử. Hệ thống cho phép người dùng đặt câu hỏi bằng **ngôn ngữ tự nhiên** (ví dụ: *"Tìm laptop lập trình dưới 20 triệu, pin trâu"*) và tự động:

1. **Trích xuất ràng buộc** từ câu hỏi (ngân sách, danh mục, tính năng) thông qua LLM API
2. **Xếp hạng sản phẩm** đa tiêu chí theo công thức Weighted Scoring (giá, thông số, rating)
3. **Tóm tắt review** ưu/nhược điểm bằng AI, có cache để tối ưu chi phí

**Ngành hàng hỗ trợ:** Laptop & Điện thoại thông minh

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────┐
│             React 18 + TypeScript (Vite)             │
│    SearchPage · ResultsPage · ProductDetailPage      │
└────────────────────────┬────────────────────────────┘
                         │ REST API (:8080/api)
┌────────────────────────▼────────────────────────────┐
│           Spring Boot 4 — Layered Monolith           │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ QueryParser  │  │   Ranker    │  │ Summarizer │  │
│  │  (LLM API)   │  │  (Weighted  │  │ (LLM API   │  │
│  │              │  │   Scoring)  │  │ + Cache)   │  │
│  └──────────────┘  └─────────────┘  └────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │ JDBC / JPA
┌────────────────────────▼────────────────────────────┐
│                  PostgreSQL 16                       │
└─────────────────────────────────────────────────────┘
                         ↕ HTTPS
              Google Gemini 2.0 Flash API
```

---

## 🛠️ Tech Stack

| Tầng | Công nghệ |
|---|---|
| **Backend** | Java 21, Spring Boot 4, Spring Data JPA, Spring Validation |
| **Database** | PostgreSQL 16 |
| **LLM** | Google Gemini 2.0 Flash API (Structured Output) |
| **Frontend** | React 18, TypeScript, Vite, Ant Design, TanStack Query |
| **API Docs** | SpringDoc OpenAPI 3 (Swagger UI) |
| **DevOps** | Docker, Docker Compose |
| **VCS** | Git + GitHub |

---

## 📁 Cấu trúc project

```
AI_Shopping_Agent/
├── backend/                        # Spring Boot project (Feature-Sliced Monolith)
│   ├── src/main/java/com/shoppingagent/
│   │   ├── ShoppingAgentApplication.java
│   │   ├── search/                 # Feature: Tìm kiếm & Xếp hạng
│   │   │   ├── SearchController.java
│   │   │   ├── SearchService.java
│   │   │   ├── QueryParserService.java
│   │   │   ├── RankingService.java
│   │   │   ├── SearchQueryRepository.java
│   │   │   ├── SearchResultRepository.java
│   │   │   └── dto/ (SearchRequest, SearchResponse, ExtractedCriteria, RankedProduct)
│   │   ├── product/                # Feature: Quản lý Sản phẩm & Danh mục
│   │   │   ├── ProductController.java
│   │   │   ├── ProductService.java
│   │   │   ├── ProductRepository.java
│   │   │   ├── CategoryRepository.java
│   │   │   └── dto/ (ProductDetailDTO)
│   │   ├── review/                 # Feature: Đánh giá & AI Tóm tắt
│   │   │   ├── ReviewController.java
│   │   │   ├── SummarizerService.java
│   │   │   ├── ReviewFilterService.java
│   │   │   ├── ReviewRepository.java
│   │   │   ├── ReviewSummaryRepository.java
│   │   │   └── dto/ (SummaryDTO)
│   │   └── shared/                 # Thành phần dùng chung (Cross-cutting)
│   │       ├── entity/ (Category, Product, Review, ReviewSummary, SearchQuery, ...)
│   │       ├── llm/ (LlmClient, GeminiClient, Exceptions)
│   │       └── config/ (OpenApiConfig, JsonbConverter)
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── application-dev.properties
│   ├── Dockerfile
│   └── pom.xml
│
├── frontend/                       # React + Vite project
│   ├── src/
│   │   ├── pages/                  # SearchPage, ResultsPage, ProductDetailPage
│   │   ├── components/             # Shared UI components
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── api/                    # Axios API client
│   │   └── types/                  # TypeScript interfaces
│   ├── nginx.conf
│   └── Dockerfile
│
├── docker-compose.yml              # Orchestration
├── .env.example                    # Template biến môi trường
├── .gitignore
└── README.md
```

---

## 🚀 Hướng dẫn cài đặt & chạy

### Yêu cầu môi trường

| Tool | Phiên bản tối thiểu |
|---|---|
| Java JDK | 21+ |
| Maven Wrapper | (đã đi kèm trong `/backend`) |
| Node.js | 20+ |
| npm | 10+ |
| Docker & Docker Compose | Docker Desktop 4.x |
| PostgreSQL (local dev) | 16+ |

---

### Cách 1: Chạy với Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/HuynhThinh06/AIShoppingAgent.git
cd AI_Shopping_Agent

# 2. Tạo file .env từ template
cp .env.example .env
# Mở .env và điền GEMINI_API_KEY, DB_PASSWORD thực của bạn

# 3. Build & chạy toàn bộ hệ thống
docker compose up --build

# Hệ thống sẵn sàng tại:
#   Frontend : http://localhost:3000
#   Backend  : http://localhost:8080/api
#   Swagger  : http://localhost:8080/api/swagger-ui.html
```

---

### Cách 2: Chạy từng phần (Local Development)

#### Backend (Spring Boot)

```bash
cd backend

# Tạo file .env hoặc set biến môi trường
set GEMINI_API_KEY=your_api_key_here
set DB_PASSWORD=postgres

# Chạy với profile dev
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# Windows: mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev
```

#### Frontend (React)

```bash
cd frontend

# Cài dependencies lần đầu
npm install

# Chạy dev server
npm run dev
# Frontend tại: http://localhost:5173
```

#### Database

```bash
# Tạo database
psql -U postgres -c "CREATE DATABASE shopping_agent;"

# Chạy schema + seed data
psql -U postgres -d shopping_agent -f ../Database_NV.sql
```

---

## 🔑 Biến môi trường

| Biến | Mô tả | Mặc định |
|---|---|---|
| `GEMINI_API_KEY` | API key Google Gemini | *(bắt buộc)* |
| `GEMINI_MODEL` | Model Gemini sử dụng | `gemini-2.0-flash` |
| `DB_NAME` | Tên database PostgreSQL | `shopping_agent` |
| `DB_USER` | Username PostgreSQL | `postgres` |
| `DB_PASSWORD` | Password PostgreSQL | *(bắt buộc)* |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `BACKEND_PORT` | Port Spring Boot | `8080` |
| `FRONTEND_PORT` | Port Nginx (Docker) | `3000` |
| `SPRING_PROFILES_ACTIVE` | Spring profile | `dev` |

> ⚠️ **KHÔNG** commit file `.env` lên Git. Chỉ commit `.env.example`.

---

## 📡 API Endpoints chính

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/search` | Tìm kiếm sản phẩm bằng ngôn ngữ tự nhiên |
| `GET` | `/api/products/{id}` | Chi tiết sản phẩm |
| `GET` | `/api/products/{id}/summary` | Tóm tắt review AI |
| `GET` | `/api/categories` | Danh sách ngành hàng |
| `GET` | `/api/actuator/health` | Health check |
| `GET` | `/api/swagger-ui.html` | Swagger UI |

---

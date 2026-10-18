import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { getAuthUser } from './utils/storage';

// P0: Core User Flow
import { HomePage } from './pages/HomePage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';

// P1: Admin & Experiment Flow
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminBenchmarkPage } from './pages/admin/AdminBenchmarkPage';
import { AdminLlmLogsPage } from './pages/admin/AdminLlmLogsPage';
import { AdminWeightsPage } from './pages/admin/AdminWeightsPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminReviewsPage } from './pages/admin/AdminReviewsPage';

// P2: Extended User & Admin Features
import { CategoryPage } from './pages/CategoryPage';
import { ComparePage } from './pages/ComparePage';
import { FavoritesPage } from './pages/FavoritesPage';
import { HistoryPage } from './pages/HistoryPage';
import { MyReviewsPage } from './pages/MyReviewsPage';
import { AuthPage } from './pages/AuthPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminProductEditPage } from './pages/admin/AdminProductEditPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Guard bảo vệ các trang quản trị
const AdminLayout: React.FC = () => {
  const user = getAuthUser();
  if (!user || !user.role?.toLowerCase().includes('admin')) {
    return <Navigate to="/auth?redirect=/admin/dashboard" replace />;
  }
  return <Outlet />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* P0: Core User Flow */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />

          {/* P2: Extended User Features */}
          <Route path="/category" element={<CategoryPage />} />
          <Route path="/category/:code" element={<CategoryPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/my-reviews" element={<MyReviewsPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* P1 & P2: Admin Control Center (Yêu cầu quyền Admin) */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/benchmark" element={<AdminBenchmarkPage />} />
            <Route path="/admin/llm-logs" element={<AdminLlmLogsPage />} />
            <Route path="/admin/weights" element={<AdminWeightsPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/products/new" element={<AdminProductEditPage />} />
            <Route path="/admin/products/:id/edit" element={<AdminProductEditPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>

          {/* Fallback 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;

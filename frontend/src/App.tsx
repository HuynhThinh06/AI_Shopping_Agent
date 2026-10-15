import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { AdminBenchmarkPage } from './pages/admin/AdminBenchmarkPage';
import { AdminLlmLogsPage } from './pages/admin/AdminLlmLogsPage';
import { AdminWeightsPage } from './pages/admin/AdminWeightsPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminReviewsPage } from './pages/admin/AdminReviewsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Core User Flow */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />

          {/* Admin & Experiment Flow */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/benchmark" element={<AdminBenchmarkPage />} />
          <Route path="/admin/llm-logs" element={<AdminLlmLogsPage />} />
          <Route path="/admin/weights" element={<AdminWeightsPage />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/reviews" element={<AdminReviewsPage />} />

          {/* Fallback 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;

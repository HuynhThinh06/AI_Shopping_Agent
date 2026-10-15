import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-20 text-center max-w-md mx-auto space-y-6">
      <div className="text-7xl font-extrabold text-amber-500">404</div>
      <h1 className="text-2xl font-extrabold text-warm-text">Không tìm thấy trang</h1>
      <p className="text-warm-muted text-sm">
        Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển.
      </p>
      <Link to="/" className="brutal-btn px-6 py-3 text-sm">
        <Home className="w-4 h-4" />
        <span>Về Trang chủ</span>
      </Link>
    </div>
  );
};

import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t-2 border-warm-border bg-warm-surface py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl border border-warm-border bg-amber-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-warm-text" />
          </div>
          <span className="font-extrabold text-sm text-warm-text">
            ShoppingAgent AI &copy; 2026
          </span>
          <span className="text-xs text-warm-muted">
            — Đồ án Tốt nghiệp / Báo cáo Tiến độ Giai đoạn 2
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-warm-muted">
          <span>Tích hợp Google Gemini Structured Output</span>
          <span>•</span>
          <span>PostgreSQL GIN Index &amp; Cache</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-amber-700">
            Made with <Heart className="w-3.5 h-3.5 fill-current text-rose-500" /> by Nhóm Phát triển
          </span>
        </div>
      </div>
    </footer>
  );
};

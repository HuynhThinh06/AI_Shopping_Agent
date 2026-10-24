import React, { useState, useEffect, useCallback } from 'react';
import { CheckSquare, X, AlertTriangle, Loader2 } from 'lucide-react';

export interface BulkActionOption {
  id: string;
  label: string;
  confirmTitle: string;
  confirmMessage: (count: number) => string;
  icon?: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'sky';
}

export function useBulkSelection(currentPageIds: number[], resetDeps: any[] = []) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, resetDeps);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isAllPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));

  const toggleAllCurrentPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected =
        currentPageIds.length > 0 && currentPageIds.every((id) => next.has(id));
      if (allSelected) {
        currentPageIds.forEach((id) => next.delete(id));
      } else {
        currentPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [currentPageIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    selectedArray: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    isAllPageSelected,
    toggleOne,
    toggleAllCurrentPage,
    clearSelection,
  };
}

interface BulkActionBarProps {
  selectedCount: number;
  entityLabel: string;
  actions: BulkActionOption[];
  loading?: boolean;
  onExecute: (actionId: string) => Promise<void> | void;
  onClear: () => void;
}

function getButtonVariantClass(variant?: BulkActionOption['variant']): string {
  switch (variant) {
    case 'emerald':
      return 'bg-emerald-600 hover:bg-emerald-700 text-white border-warm-text';
    case 'amber':
      return 'bg-amber-500 hover:bg-amber-600 text-warm-text border-warm-text';
    case 'rose':
      return 'bg-rose-600 hover:bg-rose-700 text-white border-warm-text';
    case 'sky':
    default:
      return 'bg-sky-600 hover:bg-sky-700 text-white border-warm-text';
  }
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  entityLabel,
  actions,
  loading = false,
  onExecute,
  onClear,
}) => {
  const [pendingAction, setPendingAction] = useState<BulkActionOption | null>(null);

  if (selectedCount === 0) return null;

  const handleConfirm = async () => {
    if (!pendingAction) return;
    const act = pendingAction;
    await onExecute(act.id);
    setPendingAction(null);
  };

  return (
    <>
      <div className="mb-4 p-3.5 rounded-2xl bg-warm-pastel-amber border-2 border-warm-text shadow-brutal flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-warm-primary text-warm-primary-text border-2 border-warm-text flex items-center justify-center font-black text-xs">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="font-black text-xs sm:text-sm text-warm-text">
              Đã chọn {selectedCount} {entityLabel}
            </span>
            <span className="block text-[11px] font-bold text-warm-muted">
              Chọn hành động hàng loạt để áp dụng đồng thời (tối đa 200 mục/lần)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions.map((act) => (
            <button
              key={act.id}
              type="button"
              disabled={loading}
              onClick={() => setPendingAction(act)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-xs border-2 shadow-brutal-xs transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 ${getButtonVariantClass(
                act.variant
              )}`}
            >
              {act.icon}
              <span>{act.label}</span>
            </button>
          ))}

          <button
            type="button"
            disabled={loading}
            onClick={onClear}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-warm-bg border-2 border-warm-text text-warm-text font-bold text-xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Bỏ chọn</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-6 max-w-md w-full shadow-brutal space-y-4">
            <div className="flex items-center gap-3 text-warm-primary">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base sm:text-lg font-black text-warm-text">
                {pendingAction.confirmTitle}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-warm-muted font-medium leading-relaxed">
              {pendingAction.confirmMessage(selectedCount)}
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setPendingAction(null)}
                className="px-4 py-2 rounded-xl bg-warm-bg border border-warm-text font-bold text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-xl font-black text-xs border-2 border-warm-text shadow-brutal-xs cursor-pointer inline-flex items-center gap-1.5 ${getButtonVariantClass(
                  pendingAction.variant
                )}`}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : pendingAction.icon}
                <span>
                  {loading ? 'Đang xử lý...' : `Xác nhận (${selectedCount} ${entityLabel})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

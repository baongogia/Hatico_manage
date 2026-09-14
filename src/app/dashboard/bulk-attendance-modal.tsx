"use client";

import { useState, useMemo } from "react";
import { AdminStaffRow } from "../actions";
import { formatDateButtonLabel } from "./date-picker-modal";

interface BulkAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  staffList: AdminStaffRow[];
  currentBranchFilter: string;
  branchList: { branchId: string; branchName: string }[];
  onConfirm: (
    staffToMark: AdminStaffRow[],
    checkInTimeStr?: string
  ) => Promise<void>;
}

export function BulkAttendanceModal({
  open,
  onClose,
  selectedDate,
  staffList,
  currentBranchFilter,
  branchList,
  onConfirm,
}: BulkAttendanceModalProps) {
  const [scope, setScope] = useState<"unreported_only" | "all_in_scope">("unreported_only");
  const [branchScope, setBranchScope] = useState<string>(() => currentBranchFilter);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customTime, setCustomTime] = useState("08:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize initial branchScope when opening
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setBranchScope(currentBranchFilter);
      setScope("unreported_only");
      setUseCustomTime(false);
      setIsSubmitting(false);
    }
  }

  // Filter staff by branch scope
  const scopedStaff = useMemo(() => {
    if (branchScope === "all") return staffList;
    return staffList.filter((s) => s.branch_id === branchScope);
  }, [staffList, branchScope]);

  // Target staff to be marked present
  const targetStaff = useMemo(() => {
    if (scope === "unreported_only") {
      return scopedStaff.filter((s) => !s.hasReport);
    }
    return scopedStaff;
  }, [scopedStaff, scope]);

  const activeBranchName = useMemo(() => {
    if (branchScope === "all") return "Toàn hệ thống";
    const found = branchList.find((b) => b.branchId === branchScope);
    return found ? found.branchName : "Chi nhánh";
  }, [branchList, branchScope]);

  if (!open) return null;

  const handleConfirmClick = async () => {
    if (targetStaff.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirm(targetStaff, useCustomTime ? customTime.trim() : undefined);
      onClose();
    } catch (e) {
      console.error("Failed to bulk check in:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 no-print animate-fade-in">
      <div className="bg-white border border-slate-200/90 shadow-2xl rounded-2xl max-w-lg w-full flex flex-col overflow-hidden animate-slide-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Điểm danh hàng loạt
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Ngày {formatDateButtonLabel(selectedDate)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          
          {/* Branch scope selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Phạm vi áp dụng
            </label>
            <select
              value={branchScope}
              onChange={(e) => setBranchScope(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary/25 cursor-pointer"
            >
              <option value="all">Toàn hệ thống ({staffList.length} nhân sự)</option>
              {branchList.map((b) => (
                <option key={b.branchId} value={b.branchId}>
                  {b.branchName} ({staffList.filter((s) => s.branch_id === b.branchId).length} nhân sự)
                </option>
              ))}
            </select>
          </div>

          {/* Action Scope */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Đối tượng điểm danh
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/80 cursor-pointer transition-colors bg-white">
                <input
                  type="radio"
                  name="bulkScope"
                  checked={scope === "unreported_only"}
                  onChange={() => setScope("unreported_only")}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="font-semibold text-slate-900 text-xs">
                    Chỉ điểm danh những người chưa có mặt ({scopedStaff.filter((s) => !s.hasReport).length} nhân sự)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Khuyên dùng: Giữ nguyên những ai đã điểm danh hoặc đã báo đi muộn/vắng trước đó.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/80 cursor-pointer transition-colors bg-white">
                <input
                  type="radio"
                  name="bulkScope"
                  checked={scope === "all_in_scope"}
                  onChange={() => setScope("all_in_scope")}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="font-semibold text-slate-900 text-xs">
                    Tất cả nhân sự trong phạm vi ({scopedStaff.length} nhân sự)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ghi đè trạng thái của toàn bộ nhân sự thành &quot;Đi làm đúng giờ&quot;.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Time configuration */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Giờ điểm danh
            </label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bulkTime"
                  checked={!useCustomTime}
                  onChange={() => setUseCustomTime(false)}
                  className="text-primary focus:ring-primary/20"
                />
                <span className="text-slate-700">Giờ hiện tại</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bulkTime"
                  checked={useCustomTime}
                  onChange={() => setUseCustomTime(true)}
                  className="text-primary focus:ring-primary/20"
                />
                <span className="text-slate-700">Giờ cố định:</span>
              </label>
              {useCustomTime && (
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="h-7 px-2 border border-slate-300 rounded text-xs text-slate-900 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              )}
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-emerald-900 font-medium">
                Sẽ điểm danh &quot;Đi làm&quot; cho:
              </span>
            </div>
            <span className="font-bold text-emerald-900 text-sm">
              {targetStaff.length} nhân sự ({activeBranchName})
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-9 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isSubmitting || targetStaff.length === 0}
            onClick={handleConfirmClick}
            className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-2xs"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Đang xử lý ({targetStaff.length})...</span>
              </>
            ) : (
              <span>Xác nhận điểm danh ({targetStaff.length})</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

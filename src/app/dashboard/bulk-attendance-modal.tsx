"use client";

import { useState, useMemo } from "react";
import { AdminStaffRow } from "../actions";
import { formatDateButtonLabel } from "./date-picker-modal";
import { CustomSelect } from "@/components/custom-select";

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
  onSwitchToMonthly?: () => void;
}

export function BulkAttendanceModal({
  open,
  onClose,
  selectedDate,
  staffList,
  currentBranchFilter,
  branchList,
  onConfirm,
  onSwitchToMonthly,
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
      <div className="bg-white border border-slate-200 shadow-xl rounded-xl max-w-lg w-full flex flex-col overflow-hidden animate-slide-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Điểm danh hàng loạt
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Ngày {formatDateButtonLabel(selectedDate)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Đóng"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {onSwitchToMonthly && (
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-lg p-2.5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-emerald-950 font-medium">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Bạn muốn điểm danh cho cả tháng?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToMonthly();
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                Chuyển sang cả tháng
              </button>
            </div>
          )}

          {/* Branch scope selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Phạm vi áp dụng
            </label>
            <CustomSelect
              portal
              value={branchScope}
              onChange={(val) => setBranchScope(String(val))}
              options={[
                { value: "all", label: `Toàn hệ thống (${staffList.length} nhân sự)` },
                ...branchList.map((b) => ({
                  value: b.branchId,
                  label: `${b.branchName} (${staffList.filter((s) => s.branch_id === b.branchId).length} nhân sự)`,
                })),
              ]}
              className="w-full"
              size="md"
            />
          </div>

          {/* Action Scope */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Đối tượng điểm danh
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                <input
                  type="radio"
                  name="bulkScope"
                  checked={scope === "unreported_only"}
                  onChange={() => setScope("unreported_only")}
                  className="mt-0.5 text-slate-900 focus:ring-slate-400"
                />
                <div>
                  <p className="font-medium text-slate-900 text-xs">
                    Chỉ điểm danh những người chưa có mặt ({scopedStaff.filter((s) => !s.hasReport).length} nhân sự)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Giữ nguyên trạng thái của những nhân sự đã điểm danh hoặc đã báo vắng trước đó.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                <input
                  type="radio"
                  name="bulkScope"
                  checked={scope === "all_in_scope"}
                  onChange={() => setScope("all_in_scope")}
                  className="mt-0.5 text-slate-900 focus:ring-slate-400"
                />
                <div>
                  <p className="font-medium text-slate-900 text-xs">
                    Tất cả nhân sự trong phạm vi ({scopedStaff.length} nhân sự)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Đặt trạng thái của toàn bộ nhân sự trong danh sách thành đi làm đúng giờ.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Time configuration */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-slate-700">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Giờ ghi nhận
            </label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bulkTime"
                  checked={!useCustomTime}
                  onChange={() => setUseCustomTime(false)}
                  className="text-slate-900 focus:ring-slate-400"
                />
                <span>Thời điểm thực tế</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bulkTime"
                  checked={useCustomTime}
                  onChange={() => setUseCustomTime(true)}
                  className="text-slate-900 focus:ring-slate-400"
                />
                <span>Giờ cố định:</span>
              </label>
              {useCustomTime && (
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="h-7 px-2 border border-slate-300 rounded text-xs text-slate-900 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              )}
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-slate-600 font-medium">
              Số lượng thực hiện:
            </span>
            <span className="font-semibold text-slate-900">
              {targetStaff.length} nhân sự ({activeBranchName})
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/70 shrink-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-8.5 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-md text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isSubmitting || targetStaff.length === 0}
            onClick={handleConfirmClick}
            className="h-8.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
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

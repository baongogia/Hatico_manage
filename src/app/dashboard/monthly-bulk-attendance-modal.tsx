"use client";

import { useState, useMemo } from "react";
import { markMonthlyAttendanceBulk } from "../actions";

interface MonthlyBulkAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  initialMonth: string; // "YYYY-MM"
  staffList: { id: number; full_name: string; branch_id?: string | null; branch_name?: string | null }[];
  branchList: { branchId: string; branchName: string }[];
  currentBranchFilter: string;
  isDateOff: (dateStr: string) => { isOff: boolean; reason?: string };
  onSuccess: (result: {
    monthStr: string;
    staffCount: number;
    workingDaysCount: number;
    insertedCount: number;
    updatedCount: number;
    totalRecords: number;
  }) => void;
}

export function MonthlyBulkAttendanceModal({
  open,
  onClose,
  initialMonth,
  staffList,
  branchList,
  currentBranchFilter,
  isDateOff,
  onSuccess,
}: MonthlyBulkAttendanceModalProps) {
  const [monthStr, setMonthStr] = useState<string>(() => initialMonth || "");
  const [branchScope, setBranchScope] = useState<string>("all");
  const [skipOffDays, setSkipOffDays] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [customTime, setCustomTime] = useState("08:00");
  const [useCustomTime, setUseCustomTime] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state on modal open
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMonthStr(initialMonth);
      setBranchScope(currentBranchFilter || "all");
      setSkipOffDays(true);
      setOverwriteExisting(false);
      setCustomTime("08:00");
      setUseCustomTime(true);
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }

  // Filter staff by branch scope
  const targetStaff = useMemo(() => {
    if (branchScope === "all") return staffList;
    return staffList.filter((s) => s.branch_id === branchScope);
  }, [staffList, branchScope]);

  // Compute days in month and off days
  const { totalDaysInMonth, workingDates, offDates } = useMemo(() => {
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      return { totalDaysInMonth: 0, workingDates: [], offDates: [] };
    }
    const [year, month] = monthStr.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    const wDates: string[] = [];
    const oDates: string[] = [];

    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${monthStr}-${String(d).padStart(2, "0")}`;
      const offInfo = isDateOff(dateStr);
      if (offInfo.isOff) {
        oDates.push(dateStr);
      } else {
        wDates.push(dateStr);
      }
    }

    return {
      totalDaysInMonth: lastDay,
      workingDates: skipOffDays ? wDates : [...wDates, ...oDates],
      offDates: oDates,
    };
  }, [monthStr, skipOffDays, isDateOff]);

  const activeBranchName = useMemo(() => {
    if (branchScope === "all") return "Toàn hệ thống";
    const found = branchList.find((b) => b.branchId === branchScope);
    return found ? found.branchName : "Chi nhánh";
  }, [branchList, branchScope]);

  const estimatedCheckIns = targetStaff.length * workingDates.length;

  if (!open) return null;

  const handleConfirm = async () => {
    if (targetStaff.length === 0 || workingDates.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await markMonthlyAttendanceBulk({
        monthStr,
        branchScope,
        staffIds: targetStaff.map((s) => s.id),
        customCheckInTime: useCustomTime ? customTime.trim() : "08:00",
        skipOffDays,
        offDates,
        overwriteExisting,
      });

      if ("error" in res && res.error) {
        setErrorMessage(res.error);
      } else if (res.success) {
        onSuccess({
          monthStr,
          staffCount: res.staffCount,
          workingDaysCount: res.workingDaysCount,
          insertedCount: res.insertedCount,
          updatedCount: res.updatedCount,
          totalRecords: res.totalRecords,
        });
        onClose();
      }
    } catch (err: unknown) {
      console.error("Monthly bulk attendance failed:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra trong quá trình điểm danh tháng",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 no-print animate-fade-in">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-xl max-w-lg w-full flex flex-col overflow-hidden animate-slide-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                Tự động điểm danh cả tháng
                <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                  Toàn bộ tháng
                </span>
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Ghi nhận công tự động cho tất cả nhân sự trong tháng được chọn
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
        <div className="p-5 sm:p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Chọn tháng */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Tháng áp dụng
            </label>
            <div className="flex items-center gap-3">
              <input
                type="month"
                value={monthStr}
                onChange={(e) => e.target.value && setMonthStr(e.target.value)}
                className="h-8.5 px-3 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500">
                Tháng gồm {totalDaysInMonth} ngày ({workingDates.length} ngày công, {offDates.length} ngày nghỉ)
              </span>
            </div>
          </div>

          {/* 2. Phạm vi nhân sự */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Phạm vi nhân sự
            </label>
            <select
              value={branchScope}
              onChange={(e) => setBranchScope(e.target.value)}
              className="w-full h-8.5 px-2.5 rounded border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
            >
              <option value="all">Toàn bộ nhân sự - Toàn hệ thống ({staffList.length} nhân sự)</option>
              {branchList.map((b) => (
                <option key={b.branchId} value={b.branchId}>
                  Chi nhánh {b.branchName} ({staffList.filter((s) => s.branch_id === b.branchId).length} nhân sự)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Ngày áp dụng */}
          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipOffDays}
                onChange={(e) => setSkipOffDays(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-xs font-semibold text-slate-800">
                Bỏ qua Chủ nhật & Ngày nghỉ lễ ({offDates.length} ngày)
              </span>
            </label>
            <p className="text-[11px] text-slate-500 pl-6">
              Chỉ ghi nhận công vào các ngày làm việc tiêu chuẩn ({workingDates.length} ngày trong tháng). Không ghi nhận vào Chủ nhật và các ngày lễ đã cấu hình.
            </p>
          </div>

          {/* 4. Quy tắc ghi nhận */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Chế độ điểm danh
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                <input
                  type="radio"
                  name="overwriteOption"
                  checked={!overwriteExisting}
                  onChange={() => setOverwriteExisting(false)}
                  className="mt-0.5 text-slate-900 focus:ring-slate-400"
                />
                <div>
                  <p className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                    <span>Chỉ bù những ngày chưa có công</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-normal">Khuyên dùng</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Bảo lưu các ngày đã điểm danh, đi muộn hoặc đã có đơn báo vắng trước đó.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                <input
                  type="radio"
                  name="overwriteOption"
                  checked={overwriteExisting}
                  onChange={() => setOverwriteExisting(true)}
                  className="mt-0.5 text-slate-900 focus:ring-slate-400"
                />
                <div>
                  <p className="font-semibold text-slate-900 text-xs">
                    Ghi đè tất cả các ngày làm việc
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Đồng bộ toàn bộ các ngày làm việc thành ĐI LÀM đúng giờ cho tất cả nhân sự.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 5. Giờ ghi nhận */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-slate-700">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Giờ ghi nhận công
            </label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="monthlyBulkTime"
                  checked={useCustomTime}
                  onChange={() => setUseCustomTime(true)}
                  className="text-slate-900 focus:ring-slate-400"
                />
                <span>Giờ làm việc cố định:</span>
              </label>
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="h-7 px-2 border border-slate-300 rounded text-xs text-slate-900 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* 6. Hộp tóm tắt thực hiện */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Nhân sự áp dụng:</span>
              <span className="font-semibold text-slate-900">{targetStaff.length} người ({activeBranchName})</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Số ngày công / nhân sự:</span>
              <span className="font-semibold text-slate-900">{workingDates.length} ngày</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Dự kiến tạo / cập nhật:</span>
              <span className="font-bold text-emerald-700 text-sm">~{estimatedCheckIns} lượt công</span>
            </div>
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
            disabled={isSubmitting || targetStaff.length === 0 || workingDates.length === 0}
            onClick={handleConfirm}
            className="h-8.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Đang xử lý ({targetStaff.length} người × {workingDates.length} ngày)...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Điểm danh cả tháng cho tất cả</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

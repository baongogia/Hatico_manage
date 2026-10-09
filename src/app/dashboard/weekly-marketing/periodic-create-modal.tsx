import React, { useState } from "react";
import {
  PeriodicReportType,
  MarketingPeriodicReport,
} from "@/lib/periodic-marketing-types";
import {
  getWeekDateRange,
  getMonthDateRange,
  getCurrentWeekNumber,
  getCurrentMonthNumber,
  getCurrentYear,
} from "@/lib/periodic-marketing-aggregator";
import { HATICO_BRANCHES } from "@/lib/marketing-types";

interface PeriodicCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: PeriodicReportType;
  existingReports: MarketingPeriodicReport[];
  onCreate: (periodNumber: number, year: number, branchId: string) => Promise<void>;
  onSelectExisting: (reportId: string) => void;
}

export function PeriodicCreateModal({
  isOpen,
  onClose,
  reportType,
  existingReports,
  onCreate,
  onSelectExisting,
}: PeriodicCreateModalProps) {
  const currentYear = getCurrentYear();
  const defaultPeriod =
    reportType === "weekly" ? getCurrentWeekNumber() : getCurrentMonthNumber();

  const [year, setYear] = useState<number>(currentYear);
  const [periodNumber, setPeriodNumber] = useState<number>(defaultPeriod);
  const [branchId, setBranchId] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const { startDate, endDate } =
    reportType === "weekly"
      ? getWeekDateRange(periodNumber, year)
      : getMonthDateRange(periodNumber, year);

  const formatVnDate = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  // Check if existing report already exists
  const existingConflict = existingReports.find(
    (r) =>
      r.reportType === reportType &&
      r.year === year &&
      r.periodNumber === periodNumber &&
      r.branchId === branchId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existingConflict) {
      onSelectExisting(existingConflict.id);
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate(periodNumber, year, branchId);
      onClose();
    } catch (err: any) {
      alert(err.message || "Lỗi khi tạo báo cáo mới!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs animate-fade-in no-print">
      <div className="bg-white rounded-[4px] shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {reportType === "weekly" ? "Tạo Báo cáo Tuần mới" : "Tạo Báo cáo Tháng mới"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-[4px] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Năm báo cáo
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-[4px] text-slate-900"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                {reportType === "weekly" ? "Chọn tuần" : "Chọn tháng"}
              </label>
              <select
                value={periodNumber}
                onChange={(e) => setPeriodNumber(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-[4px] text-slate-900"
              >
                {reportType === "weekly"
                  ? Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>
                        Tuần {w}
                      </option>
                    ))
                  : Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        Tháng {m}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Phạm vi chi nhánh
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-[4px] text-slate-900"
            >
              <option value="all">Toàn hệ thống Hatico</option>
              {HATICO_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range preview */}
          <div className="p-3 bg-slate-50 rounded-[4px] border border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Khoảng ngày kỳ báo cáo:</span>
            <span className="font-bold text-slate-800">
              {formatVnDate(startDate)} → {formatVnDate(endDate)}
            </span>
          </div>

          {/* Conflict warning */}
          {existingConflict && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-[4px] text-amber-800 leading-snug">
              ⚠️ Kỳ này đã có báo cáo (trạng thái:{" "}
              <strong>
                {existingConflict.status === "closed" ? "Đã chốt" : "Bản nháp"}
              </strong>
              ). Bấm &quot;Mở báo cáo hiện có&quot; để xem.
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[4px] border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
            >
              Hủy
            </button>

            {existingConflict ? (
              <button
                type="submit"
                className="px-4 py-1.5 rounded-[4px] bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
              >
                Mở báo cáo hiện có
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-[4px] bg-primary hover:bg-primary-hover text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Đang tạo & tổng hợp..." : "Tạo báo cáo kỳ này"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

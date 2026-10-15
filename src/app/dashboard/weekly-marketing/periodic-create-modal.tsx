import React, { useState, useMemo } from "react";
import {
  PeriodicReportType,
  MarketingPeriodicReport,
} from "@/lib/periodic-marketing-types";
import {
  getWeekDateRange,
  getMultiWeekDateRange,
  getMonthDateRange,
  getCurrentWeekNumber,
  getCurrentMonthNumber,
  getCurrentYear,
} from "@/lib/periodic-marketing-aggregator";
import { HATICO_BRANCHES } from "@/lib/marketing-types";
import { CustomSelect } from "@/components/custom-select";

export interface CreatePeriodicReportParams {
  reportType: PeriodicReportType;
  periodNumber: number;
  year: number;
  branchId: string;
  startDate?: string;
  endDate?: string;
  periodSpan?: number;
  startWeek?: number;
  endWeek?: number;
  periodLabel?: string;
}

interface PeriodicCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: PeriodicReportType;
  existingReports: MarketingPeriodicReport[];
  onCreate: (params: CreatePeriodicReportParams) => Promise<void>;
  onSelectExisting: (reportId: string) => void;
}

type SpanMode = "1_week" | "2_weeks" | "3_weeks" | "custom_dates" | "month";

export function PeriodicCreateModal({
  isOpen,
  onClose,
  reportType,
  existingReports,
  onCreate,
  onSelectExisting,
}: PeriodicCreateModalProps) {
  const currentYear = getCurrentYear();
  const currentWeek = getCurrentWeekNumber();
  const currentMonth = getCurrentMonthNumber();

  // Mode selection: 1 tuần, 2 tuần, 3 tuần, tùy chọn ngày
  const [spanMode, setSpanMode] = useState<SpanMode>(() => {
    if (reportType === "monthly") return "month";
    if (reportType === "custom") return "custom_dates";
    return "1_week";
  });

  const [year, setYear] = useState<number>(currentYear);
  const [weekNumber, setWeekNumber] = useState<number>(currentWeek);

  // 2-week range end week (default currentWeek, spans [currentWeek - 1, currentWeek])
  const [twoWeekEnd, setTwoWeekEnd] = useState<number>(currentWeek);

  // 3-week range end week (default currentWeek, spans [currentWeek - 2, currentWeek])
  const [threeWeekEnd, setThreeWeekEnd] = useState<number>(currentWeek);

  const [monthNumber, setMonthNumber] = useState<number>(currentMonth);
  const [branchId, setBranchId] = useState<string>("all");

  // Custom date inputs (default 14 days back to today)
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const formatVnDate = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  // Compute startDate, endDate, periodNumber, periodSpan, periodLabel based on current inputs
  const resolved = useMemo(() => {
    if (spanMode === "1_week") {
      const range = getWeekDateRange(weekNumber, year);
      return {
        targetReportType: "weekly" as PeriodicReportType,
        startDate: range.startDate,
        endDate: range.endDate,
        periodNumber: weekNumber,
        periodSpan: 1,
        startWeek: weekNumber,
        endWeek: weekNumber,
        periodLabel: `Tuần ${weekNumber} / ${year}`,
        durationDays: 7,
        spanSummary: "1 tuần (7 ngày)",
      };
    }

    if (spanMode === "2_weeks") {
      const startW = Math.max(1, twoWeekEnd - 1);
      const endW = twoWeekEnd;
      const range = getMultiWeekDateRange(startW, endW, year);
      return {
        targetReportType: "weekly" as PeriodicReportType,
        startDate: range.startDate,
        endDate: range.endDate,
        periodNumber: 20000 + startW * 100 + endW,
        periodSpan: 2,
        startWeek: startW,
        endWeek: endW,
        periodLabel: `Tuần ${startW} – ${endW} / ${year} (2 tuần)`,
        durationDays: 14,
        spanSummary: `2 tuần · Tuần ${startW} → ${endW} (14 ngày)`,
      };
    }

    if (spanMode === "3_weeks") {
      const startW = Math.max(1, threeWeekEnd - 2);
      const endW = threeWeekEnd;
      const range = getMultiWeekDateRange(startW, endW, year);
      return {
        targetReportType: "weekly" as PeriodicReportType,
        startDate: range.startDate,
        endDate: range.endDate,
        periodNumber: 30000 + startW * 100 + endW,
        periodSpan: 3,
        startWeek: startW,
        endWeek: endW,
        periodLabel: `Tuần ${startW} – ${endW} / ${year} (3 tuần)`,
        durationDays: 21,
        spanSummary: `3 tuần · Tuần ${startW} → ${endW} (21 ngày)`,
      };
    }

    if (spanMode === "month") {
      const range = getMonthDateRange(monthNumber, year);
      const diffMs = new Date(range.endDate).getTime() - new Date(range.startDate).getTime();
      const days = Math.round(diffMs / 86400000) + 1;
      return {
        targetReportType: "monthly" as PeriodicReportType,
        startDate: range.startDate,
        endDate: range.endDate,
        periodNumber: monthNumber,
        periodSpan: 1,
        startWeek: undefined,
        endWeek: undefined,
        periodLabel: `Tháng ${monthNumber} / ${year}`,
        durationDays: days,
        spanSummary: `1 tháng (${days} ngày)`,
      };
    }

    // custom_dates
    const sDate = customStartDate || new Date().toISOString().slice(0, 10);
    const eDate = customEndDate || sDate;
    const diffMs = new Date(eDate).getTime() - new Date(sDate).getTime();
    const days = Math.max(1, Math.round(diffMs / 86400000) + 1);
    const approxWeeks = Number((days / 7).toFixed(1));
    const cleanId = Number(sDate.replace(/-/g, "").slice(4, 8)) || 1;
    return {
      targetReportType: "custom" as PeriodicReportType,
      startDate: sDate,
      endDate: eDate,
      periodNumber: 90000 + cleanId,
      periodSpan: Math.max(1, Math.round(days / 7)),
      startWeek: undefined,
      endWeek: undefined,
      periodLabel: `Báo cáo ${formatVnDate(sDate)} → ${formatVnDate(eDate)} (${days} ngày)`,
      durationDays: days,
      spanSummary: `${days} ngày (~${approxWeeks} tuần)`,
    };
  }, [
    spanMode,
    weekNumber,
    twoWeekEnd,
    threeWeekEnd,
    monthNumber,
    year,
    customStartDate,
    customEndDate,
  ]);

  if (!isOpen) return null;

  // Check if existing report already exists
  const existingConflict = existingReports.find(
    (r) =>
      r.branchId === branchId &&
      r.startDate === resolved.startDate &&
      r.endDate === resolved.endDate
  );

  const handleApplyPreset = (daysBack: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (daysBack - 1));
    setCustomStartDate(start.toISOString().slice(0, 10));
    setCustomEndDate(end.toISOString().slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existingConflict) {
      onSelectExisting(existingConflict.id);
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        reportType: resolved.targetReportType,
        periodNumber: resolved.periodNumber,
        year,
        branchId,
        startDate: resolved.startDate,
        endDate: resolved.endDate,
        periodSpan: resolved.periodSpan,
        startWeek: resolved.startWeek,
        endWeek: resolved.endWeek,
        periodLabel: resolved.periodLabel,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || "Lỗi khi tạo báo cáo mới!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs animate-fade-in no-print">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {reportType === "monthly" ? "Tạo Báo cáo Tháng" : "Tạo Báo cáo Marketing Linh hoạt"}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Hỗ trợ tạo báo cáo 1 tuần, 2 tuần, 3 tuần hoặc tùy chọn ngày linh hoạt
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Mode Selector Pills */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Chọn độ dài / Kiểu kỳ báo cáo
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => setSpanMode("1_week")}
                className={`py-1.5 px-2 rounded text-xs font-semibold transition-all cursor-pointer text-center ${
                  spanMode === "1_week"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1 tuần
              </button>
              <button
                type="button"
                onClick={() => setSpanMode("2_weeks")}
                className={`py-1.5 px-2 rounded text-xs font-semibold transition-all cursor-pointer text-center ${
                  spanMode === "2_weeks"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                2 tuần
              </button>
              <button
                type="button"
                onClick={() => setSpanMode("3_weeks")}
                className={`py-1.5 px-2 rounded text-xs font-semibold transition-all cursor-pointer text-center ${
                  spanMode === "3_weeks"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                3 tuần
              </button>
              <button
                type="button"
                onClick={() => setSpanMode(reportType === "monthly" ? "month" : "custom_dates")}
                className={`py-1.5 px-2 rounded text-xs font-semibold transition-all cursor-pointer text-center ${
                  spanMode === "custom_dates" || spanMode === "month"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {reportType === "monthly" ? "Theo tháng" : "Tùy chọn ngày"}
              </button>
            </div>
          </div>

          {/* Controls for 1 week */}
          {spanMode === "1_week" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Năm báo cáo
                </label>
                <CustomSelect
                  portal
                  value={year}
                  onChange={(val) => setYear(Number(val))}
                  options={[currentYear, currentYear - 1, currentYear - 2].map((y) => ({
                    value: y,
                    label: `Năm ${y}`,
                  }))}
                  className="w-full"
                  size="md"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Chọn tuần
                </label>
                <CustomSelect
                  portal
                  value={weekNumber}
                  onChange={(val) => setWeekNumber(Number(val))}
                  options={Array.from({ length: 52 }, (_, i) => {
                    const w = 52 - i;
                    const r = getWeekDateRange(w, year);
                    return {
                      value: w,
                      label: `Tuần ${w} (${formatVnDate(r.startDate).slice(0, 5)} – ${formatVnDate(r.endDate).slice(0, 5)})${w === currentWeek ? " · Hiện tại" : ""}`,
                    };
                  })}
                  className="w-full"
                  size="md"
                />
              </div>
            </div>
          )}

          {/* Controls for 2 weeks */}
          {spanMode === "2_weeks" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Năm báo cáo
                </label>
                <CustomSelect
                  portal
                  value={year}
                  onChange={(val) => setYear(Number(val))}
                  options={[currentYear, currentYear - 1, currentYear - 2].map((y) => ({
                    value: y,
                    label: `Năm ${y}`,
                  }))}
                  className="w-full"
                  size="md"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Chọn kỳ 2 tuần
                </label>
                <CustomSelect
                  portal
                  value={twoWeekEnd}
                  onChange={(val) => setTwoWeekEnd(Number(val))}
                  options={Array.from({ length: 51 }, (_, i) => {
                    const endW = 52 - i;
                    const startW = endW - 1;
                    const r = getMultiWeekDateRange(startW, endW, year);
                    const isLatest = endW === currentWeek;
                    return {
                      value: endW,
                      label: `Tuần ${startW} – ${endW} (${formatVnDate(r.startDate).slice(0, 5)} – ${formatVnDate(r.endDate).slice(0, 5)})${isLatest ? " · 2 tuần gần nhất" : ""}`,
                    };
                  })}
                  className="w-full"
                  size="md"
                />
              </div>
            </div>
          )}

          {/* Controls for 3 weeks */}
          {spanMode === "3_weeks" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Năm báo cáo
                </label>
                <CustomSelect
                  portal
                  value={year}
                  onChange={(val) => setYear(Number(val))}
                  options={[currentYear, currentYear - 1, currentYear - 2].map((y) => ({
                    value: y,
                    label: `Năm ${y}`,
                  }))}
                  className="w-full"
                  size="md"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Chọn kỳ 3 tuần
                </label>
                <CustomSelect
                  portal
                  value={threeWeekEnd}
                  onChange={(val) => setThreeWeekEnd(Number(val))}
                  options={Array.from({ length: 50 }, (_, i) => {
                    const endW = 52 - i;
                    const startW = endW - 2;
                    const r = getMultiWeekDateRange(startW, endW, year);
                    const isLatest = endW === currentWeek;
                    return {
                      value: endW,
                      label: `Tuần ${startW} – ${endW} (${formatVnDate(r.startDate).slice(0, 5)} – ${formatVnDate(r.endDate).slice(0, 5)})${isLatest ? " · 3 tuần gần nhất" : ""}`,
                    };
                  })}
                  className="w-full"
                  size="md"
                />
              </div>
            </div>
          )}

          {/* Controls for month */}
          {spanMode === "month" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Năm báo cáo
                </label>
                <CustomSelect
                  portal
                  value={year}
                  onChange={(val) => setYear(Number(val))}
                  options={[currentYear, currentYear - 1, currentYear - 2].map((y) => ({
                    value: y,
                    label: `Năm ${y}`,
                  }))}
                  className="w-full"
                  size="md"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Chọn tháng
                </label>
                <CustomSelect
                  portal
                  value={monthNumber}
                  onChange={(val) => setMonthNumber(Number(val))}
                  options={Array.from({ length: 12 }, (_, i) => ({
                    value: i + 1,
                    label: `Tháng ${i + 1}${i + 1 === currentMonth ? " · Hiện tại" : ""}`,
                  }))}
                  className="w-full"
                  size="md"
                />
              </div>
            </div>
          )}

          {/* Controls for custom dates */}
          {spanMode === "custom_dates" && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <span className="text-[11px] text-slate-500 font-medium">Nhanh:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(14)}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  14 ngày (2 tuần)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(21)}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  21 ngày (3 tuần)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(30)}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  30 ngày qua
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full h-9 px-3 rounded border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full h-9 px-3 rounded border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Branch scope */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Phạm vi chi nhánh
            </label>
            <CustomSelect
              portal
              value={branchId}
              onChange={(val) => setBranchId(String(val))}
              options={[
                { value: "all", label: "Toàn hệ thống Hatico" },
                ...HATICO_BRANCHES.map((b) => ({
                  value: b.id,
                  label: b.name,
                })),
              ]}
              className="w-full"
              size="md"
            />
          </div>

          {/* Date range & Title preview card */}
          <div className="p-3 bg-slate-50/90 rounded-md border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Kỳ báo cáo:</span>
              <span className="font-bold text-primary text-xs">
                {resolved.periodLabel}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Khoảng ngày:</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatVnDate(resolved.startDate)} → {formatVnDate(resolved.endDate)}
                <span className="ml-1 text-slate-500 font-normal">
                  ({resolved.durationDays} ngày)
                </span>
              </span>
            </div>
          </div>

          {/* Conflict warning */}
          {existingConflict && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs leading-snug">
              ⚠️ Kỳ này đã có báo cáo trong hệ thống (trạng thái:{" "}
              <strong>
                {existingConflict.status === "closed" ? "Đã chốt" : "Bản nháp"}
              </strong>
              ). Bấm &quot;Mở báo cáo hiện có&quot; để xem chi tiết.
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
            >
              Hủy
            </button>

            {existingConflict ? (
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
              >
                Mở báo cáo hiện có
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-primary hover:bg-primary-hover text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Đang tổng hợp số liệu..." : "Tạo báo cáo kỳ này"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

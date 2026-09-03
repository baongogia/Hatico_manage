"use client";

import { useState, useMemo } from "react";
import {
  OffDaySettings,
  CustomHoliday,
  DEFAULT_OFF_DAY_SETTINGS,
} from "@/lib/off-day-settings";

interface OffDaySettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: OffDaySettings;
  onSave: (newSettings: OffDaySettings) => void;
}

const WEEKDAY_OPTIONS = [
  { day: 1, label: "Thứ 2", short: "T2" },
  { day: 2, label: "Thứ 3", short: "T3" },
  { day: 3, label: "Thứ 4", short: "T4" },
  { day: 4, label: "Thứ 5", short: "T5" },
  { day: 5, label: "Thứ 6", short: "T6" },
  { day: 6, label: "Thứ 7", short: "T7" },
  { day: 0, label: "Chủ nhật", short: "CN" },
];

export function OffDaySettingsModal({
  open,
  onClose,
  settings,
  onSave,
}: OffDaySettingsModalProps) {
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>(
    () => settings.weeklyOffDays,
  );
  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>(
    () => settings.customHolidays,
  );

  // Form input state (supports date range)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setWeeklyOffDays(settings.weeklyOffDays);
      setCustomHolidays(settings.customHolidays);
      setEditingId(null);
      setStartDate("");
      setEndDate("");
      setHolidayName("");
      setFormError("");
      setSearchQuery("");
    }
  }

  const toggleWeeklyDay = (day: number) => {
    setWeeklyOffDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const calculateDaysCount = (start: string, end?: string) => {
    if (!start) return 0;
    const finalEnd = end && end >= start ? end : start;
    const s = new Date(start);
    const e = new Date(finalEnd);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const totalHolidayDays = useMemo(() => {
    return customHolidays.reduce((acc, h) => acc + calculateDaysCount(h.date, h.endDate), 0);
  }, [customHolidays]);

  const filteredHolidays = useMemo(() => {
    if (!searchQuery.trim()) return customHolidays;
    const q = searchQuery.toLowerCase();
    return customHolidays.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.date.includes(q) ||
        (h.endDate && h.endDate.includes(q)),
    );
  }, [customHolidays, searchQuery]);

  if (!open) return null;

  const handleSelectToEdit = (h: CustomHoliday) => {
    setEditingId(h.id);
    setStartDate(h.date);
    setEndDate(h.endDate || h.date);
    setHolidayName(h.name);
    setFormError("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setStartDate("");
    setEndDate("");
    setHolidayName("");
    setFormError("");
  };

  const handleSaveHolidayForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      setFormError("Vui lòng chọn ngày bắt đầu.");
      return;
    }

    const finalEndDate = endDate && endDate >= startDate ? endDate : undefined;
    const nameToSave = holidayName.trim() || "Ngày nghỉ lễ";

    if (editingId) {
      // Update existing
      setCustomHolidays((prev) =>
        prev
          .map((h) =>
            h.id === editingId
              ? { ...h, date: startDate, endDate: finalEndDate, name: nameToSave }
              : h,
          )
          .sort((a, b) => a.date.localeCompare(b.date)),
      );
      handleCancelEdit();
    } else {
      // Add new
      const newHoliday: CustomHoliday = {
        id: `holiday-${Date.now()}`,
        date: startDate,
        endDate: finalEndDate,
        name: nameToSave,
      };
      setCustomHolidays((prev) =>
        [...prev, newHoliday].sort((a, b) => a.date.localeCompare(b.date)),
      );
      setStartDate("");
      setEndDate("");
      setHolidayName("");
      setFormError("");
    }
  };

  const handleRemoveHoliday = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCustomHolidays((prev) => prev.filter((h) => h.id !== id));
    if (editingId === id) {
      handleCancelEdit();
    }
  };

  const handleQuickAddPreset = (start: string, end: string | undefined, name: string) => {
    setStartDate(start);
    setEndDate(end || start);
    setHolidayName(name);
    setFormError("");
  };

  const handleResetDefaults = () => {
    if (window.confirm("Khôi phục về cài đặt mặc định (Nghỉ Chủ nhật & ngày lễ chính)?")) {
      setWeeklyOffDays(DEFAULT_OFF_DAY_SETTINGS.weeklyOffDays);
      setCustomHolidays(DEFAULT_OFF_DAY_SETTINGS.customHolidays);
      handleCancelEdit();
    }
  };

  const handleSaveAll = () => {
    onSave({
      weeklyOffDays,
      customHolidays,
    });
    onClose();
  };

  const formatDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print animate-fade-in">
      <div className="bg-white border border-slate-200/90 shadow-2xl rounded-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-slide-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Cài đặt ngày nghỉ & Lịch nghỉ lễ
              </h3>
              <p className="text-slate-400 text-[11px] font-medium mt-0.5">
                Cấu hình ngày nghỉ cố định và các đợt nghỉ lễ để tự động vô hiệu hóa điểm danh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body: Modern Two-Column Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 overflow-y-auto">
          
          {/* Left Column: Weekly recurring & Add Form (5 cols) */}
          <div className="md:col-span-5 p-5 space-y-4 bg-slate-50/40 overflow-y-auto no-scrollbar">
            
            {/* 1. Weekly recurring off-days */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Nghỉ định kỳ hàng tuần
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Mặc định: CN</span>
              </div>
              <div className="grid grid-cols-7 gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                {WEEKDAY_OPTIONS.map((item) => {
                  const isSelected = weeklyOffDays.includes(item.day);
                  return (
                    <button
                      key={item.day}
                      type="button"
                      onClick={() => toggleWeeklyDay(item.day)}
                      title={`Nhấn để ${isSelected ? "hủy nghỉ" : "đặt nghỉ"} ${item.label}`}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                        isSelected
                          ? "bg-amber-600 text-white shadow-xs font-black"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="text-[10px]">{item.short}</div>
                      <div className="text-[8px] opacity-80 mt-0.5">{isSelected ? "Nghỉ" : "Làm"}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Add / Edit Holiday Form */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {editingId ? "Chỉnh sửa đợt nghỉ" : "Thêm đợt nghỉ mới"}
                </label>
                {editingId && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-200">
                    Đang sửa
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveHolidayForm} className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                {/* Date range picker */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Từ ngày <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStartDate(val);
                        if (!endDate || endDate < val) setEndDate(val);
                        setFormError("");
                      }}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/25 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      min={startDate}
                      value={endDate}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setFormError("");
                      }}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/25 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Holiday Name */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Tên dịp lễ / đợt nghỉ
                  </label>
                  <input
                    type="text"
                    placeholder="vd: Nghỉ lễ 30/4 - 1/5, Nghỉ Tết, Du lịch..."
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/25"
                  />
                </div>

                {formError && (
                  <p className="text-[10px] text-rose-600 font-bold">{formError}</p>
                )}

                {/* Form Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 h-9 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {editingId ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      )}
                    </svg>
                    <span>{editingId ? "Cập nhật đợt nghỉ" : "Thêm vào danh sách"}</span>
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Gợi ý nhanh:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { start: "2026-01-01", end: "2026-01-01", name: "Tết Dương lịch" },
                      { start: "2026-04-30", end: "2026-05-01", name: "30/4 - 1/5" },
                      { start: "2026-09-02", end: "2026-09-03", name: "Quốc khánh 2/9" },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleQuickAddPreset(preset.start, preset.end, preset.name)}
                        className="text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        + {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Clean Holiday Table / List (7 cols) */}
          <div className="md:col-span-7 p-5 flex flex-col min-h-0 bg-white">
            
            {/* List Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 shrink-0">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>Danh sách đợt nghỉ lễ</span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {customHolidays.length} đợt · {totalHolidayDays} ngày
                  </span>
                </h4>
              </div>

              {/* Search Bar */}
              {customHolidays.length > 3 && (
                <div className="relative w-full sm:w-44">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="search"
                    placeholder="Tìm ngày, tên lễ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-7 pl-7 pr-2 text-[11px] rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-medium text-slate-800"
                  />
                </div>
              )}
            </div>

            {/* List / Table Container */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200/80 min-h-0 no-scrollbar">
              {filteredHolidays.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400 text-center px-4">
                  <svg className="w-8 h-8 stroke-1 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs font-semibold text-slate-500">
                    {searchQuery ? "Không tìm thấy đợt nghỉ phù hợp" : "Chưa có đợt nghỉ lễ nào"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Thêm đợt nghỉ lễ ở form bên trái để áp dụng cho bảng công
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredHolidays.map((h, idx) => {
                    const isRange = Boolean(h.endDate && h.endDate > h.date);
                    const daysCount = calculateDaysCount(h.date, h.endDate);
                    const isSelected = editingId === h.id;

                    return (
                      <div
                        key={h.id}
                        onClick={() => handleSelectToEdit(h)}
                        className={`px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer group ${
                          isSelected
                            ? "bg-amber-50/70 border-l-3 border-amber-500"
                            : idx % 2 === 1
                              ? "bg-slate-50/40 hover:bg-slate-100/60"
                              : "bg-white hover:bg-slate-100/60"
                        }`}
                      >
                        {/* Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Date Range Badge */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                              {formatDateDisplay(h.date)}
                              {isRange && ` → ${formatDateDisplay(h.endDate!)}`}
                            </span>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded">
                              {daysCount} ngày
                            </span>
                          </div>

                          {/* Holiday Name */}
                          <span className="font-semibold text-slate-800 text-xs truncate">
                            {h.name}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectToEdit(h);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-primary hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveHoliday(e, h.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                            title="Xóa đợt nghỉ này"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 mt-2 italic flex items-center gap-1 shrink-0">
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Bấm vào bất kỳ dòng nào trong danh sách để chỉnh sửa ngày hoặc tên đợt nghỉ
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer underline"
          >
            Khôi phục mặc định
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="bg-primary hover:bg-primary-hover text-white font-bold px-5 py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
            >
              Lưu cài đặt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { AutoAttendanceSettings } from "@/lib/auto-attendance-settings";
import { AdminStaffRow } from "../actions";

interface AutoAttendanceSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: AutoAttendanceSettings;
  onSave: (newSettings: AutoAttendanceSettings) => void;
  staffList: AdminStaffRow[];
  branchList: { branchId: string; branchName: string }[];
  onTriggerNow?: (selectedStaffIds: number[]) => Promise<void>;
  isTriggering?: boolean;
}

export function AutoAttendanceSettingsModal({
  open,
  onClose,
  settings,
  onSave,
  staffList,
  branchList,
  onTriggerNow,
  isTriggering = false,
}: AutoAttendanceSettingsModalProps) {
  const [enabled, setEnabled] = useState<boolean>(() => settings.enabled);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>(() => settings.staffIds);
  const [autoCheckInTime, setAutoCheckInTime] = useState<string>(() => settings.autoCheckInTime || "");
  const [useCustomTime, setUseCustomTime] = useState<boolean>(() => !!settings.autoCheckInTime);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setEnabled(settings.enabled);
      setSelectedStaffIds(settings.staffIds);
      setAutoCheckInTime(settings.autoCheckInTime || "");
      setUseCustomTime(!!settings.autoCheckInTime);
      setSearchQuery("");
      setBranchFilter("all");
    }
  }

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (branchFilter !== "all" && s.branch_id !== branchFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = [s.full_name, s.branch_name, s.position, s.department]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [staffList, branchFilter, searchQuery]);

  const allFilteredSelected = useMemo(() => {
    if (filteredStaff.length === 0) return false;
    return filteredStaff.every((s) => selectedStaffIds.includes(s.id));
  }, [filteredStaff, selectedStaffIds]);

  const toggleStaff = (id: number) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredStaff.map((s) => s.id);
    setSelectedStaffIds((prev) => {
      const set = new Set([...prev, ...filteredIds]);
      return Array.from(set);
    });
  };

  const handleDeselectAllFiltered = () => {
    const filteredIdSet = new Set(filteredStaff.map((s) => s.id));
    setSelectedStaffIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
  };

  const handleSelectAllInSystem = () => {
    setSelectedStaffIds(staffList.map((s) => s.id));
  };

  const handleDeselectAllInSystem = () => {
    setSelectedStaffIds([]);
  };

  const handleSave = () => {
    onSave({
      enabled,
      staffIds: selectedStaffIds,
      autoCheckInTime: useCustomTime ? autoCheckInTime.trim() : "",
      autoRunOnLoad: true,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 no-print animate-fade-in">
      <div className="bg-white border border-slate-200/90 shadow-2xl rounded-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-slide-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                Cài đặt Điểm danh tự động
                {enabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Đang bật
                  </span>
                )}
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Tự động điểm danh &quot;Đi làm&quot; vào các ngày làm việc cho danh sách nhân sự được chọn
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 min-h-0 bg-white">
          
          {/* 1. Master Toggle & Time Settings Card */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <div>
                  <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                    Kích hoạt Điểm danh tự động
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Tự động ghi nhận đi làm khi xem bảng điểm danh ngày (trừ ngày nghỉ/Chủ nhật)
                  </p>
                </div>
              </div>

              {onTriggerNow && (
                <button
                  type="button"
                  disabled={isTriggering || selectedStaffIds.length === 0}
                  onClick={() => onTriggerNow(selectedStaffIds)}
                  className="h-8 px-3 rounded-lg text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200/80 border border-amber-300/80 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                >
                  {isTriggering ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-amber-800" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Đang điểm danh...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Chạy tự động ngay</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Time Configuration */}
            <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-4 text-xs">
              <span className="font-medium text-slate-700">Giờ điểm danh:</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="timeOption"
                  checked={!useCustomTime}
                  onChange={() => setUseCustomTime(false)}
                  className="text-primary focus:ring-primary/20"
                />
                <span className="text-slate-700">Giờ hiện tại khi chạy</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="timeOption"
                  checked={useCustomTime}
                  onChange={() => setUseCustomTime(true)}
                  className="text-primary focus:ring-primary/20"
                />
                <span className="text-slate-700">Giờ cố định:</span>
              </label>
              {useCustomTime && (
                <input
                  type="time"
                  value={autoCheckInTime || "08:00"}
                  onChange={(e) => setAutoCheckInTime(e.target.value)}
                  className="h-7 px-2 border border-slate-300 rounded text-xs text-slate-900 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              )}
            </div>
          </div>

          {/* 2. Staff Selection Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span>Chọn nhân sự tự động điểm danh</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                    {selectedStaffIds.length} / {staffList.length} nhân sự
                  </span>
                </label>
              </div>

              {/* Quick action buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={allFilteredSelected ? handleDeselectAllFiltered : handleSelectAllFiltered}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
                >
                  {allFilteredSelected ? "Bỏ chọn danh sách lọc" : "Chọn tất cả danh sách lọc"}
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllInSystem}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllInSystem}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50/50 p-2 rounded-lg border border-slate-200/70">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary/25 cursor-pointer"
              >
                <option value="all">Tất cả chi nhánh ({staffList.length})</option>
                {branchList.map((b) => (
                  <option key={b.branchId} value={b.branchId}>
                    {b.branchName}
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="search"
                  placeholder="Tìm theo tên, chức vụ, bộ phận..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-md border border-slate-200 bg-white text-xs font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/25"
                />
              </div>
            </div>

            {/* Staff list container */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[340px] overflow-y-auto divide-y divide-slate-100 bg-white">
              {filteredStaff.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Không tìm thấy nhân viên phù hợp với bộ lọc
                </div>
              ) : (
                filteredStaff.map((staff) => {
                  const isChecked = selectedStaffIds.includes(staff.id);
                  return (
                    <div
                      key={staff.id}
                      onClick={() => toggleStaff(staff.id)}
                      className={`px-3.5 py-2 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isChecked ? "bg-emerald-50/40 hover:bg-emerald-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Controlled by row click
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {staff.full_name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
                            <span>{staff.branch_name}</span>
                            {staff.department && (
                              <>
                                <span>•</span>
                                <span>{staff.department}</span>
                              </>
                            )}
                            {staff.position && (
                              <>
                                <span>•</span>
                                <span className="text-slate-400">{staff.position}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                          isChecked
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {isChecked ? "Được chọn" : "Bỏ qua"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <div className="text-xs text-slate-500">
            Đã chọn <strong className="text-slate-900 font-bold">{selectedStaffIds.length}</strong> nhân sự
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-9 px-5 bg-primary text-white hover:bg-primary-hover font-semibold rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
            >
              Lưu cài đặt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  getAdminDashboardData,
  getAdminMonthlyAttendance,
  AdminDashboardData,
  AdminMonthlyAttendanceData,
  AdminStaffRow,
  MonthlyAttendanceStaffRow,
  markStaffPresent,
  markStaffAbsent,
  markStaffLate,
  StaffAttendanceUpdate,
} from "../actions";
import {
  applyMonthlyAttendanceUpdate,
  applyStaffAttendanceUpdate,
  attendanceCellKey,
} from "@/lib/admin-dashboard-utils";
import { downloadAdminAttendanceExcel, downloadDailyAttendanceExcel } from "@/lib/attendance-export";
import { useOffDaySettings } from "@/lib/off-day-settings";
import DatePickerModal, { formatDateButtonLabel } from "./date-picker-modal";
import AdminSelect, { adminControlClass } from "./admin-select";
import { DailyAttendancePreviewModal, MonthlyAttendancePreviewModal } from "./attendance-preview-modal";
import { OffDaySettingsModal } from "./off-day-settings-modal";

type AdminAttendancePanelProps = {
  initialData: AdminDashboardData;
  onDataUpdate?: (data: AdminDashboardData) => void;
};

export function AdminAttendancePanel({
  initialData,
  onDataUpdate,
}: AdminAttendancePanelProps) {
  const [isPending, startTransition] = useTransition();
  const [dailyData, setDailyData] = useState(initialData);
  const [selectedDate, setSelectedDate] = useState(initialData.date);

  const [subTab, setSubTab] = useState<"daily" | "monthly">("daily");

  const { settings: offDaySettings, updateSettings: updateOffDaySettings, isDateOff } = useOffDaySettings();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const selectedDayOffInfo = useMemo(() => isDateOff(selectedDate), [isDateOff, selectedDate]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
  }, []);

  // Monthly Attendance State
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [monthlyData, setMonthlyData] = useState<AdminMonthlyAttendanceData | null>(null);
  const [loadingMonthly, startLoadingMonthly] = useTransition();
  const [errorMonthly, setErrorMonthly] = useState("");

  // Toggling state (supports parallel updates)
  const [togglingCells, setTogglingCells] = useState<Set<string>>(() => new Set());

  const addToggling = useCallback((staffId: number, dateStr: string) => {
    const key = attendanceCellKey(staffId, dateStr);
    setTogglingCells((prev) => new Set(prev).add(key));
  }, []);

  const removeToggling = useCallback((staffId: number, dateStr: string) => {
    const key = attendanceCellKey(staffId, dateStr);
    setTogglingCells((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const isCellToggling = useCallback(
    (staffId: number, dateStr: string) => togglingCells.has(attendanceCellKey(staffId, dateStr)),
    [togglingCells],
  );

  const commitStaffUpdate = useCallback(
    (update: StaffAttendanceUpdate, dateStr: string) => {
      if (dateStr === selectedDate) {
        setDailyData((prev) => applyStaffAttendanceUpdate(prev, update));
      }
      setMonthlyData((prev) =>
        prev ? applyMonthlyAttendanceUpdate(prev, update, dateStr) : prev,
      );
    },
    [selectedDate],
  );

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onDataUpdate?.(dailyData);
  }, [dailyData, onDataUpdate]);

  // Inline editing of reasons
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [editingReasonText, setEditingReasonText] = useState("");

  // Reason Modal State
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonModalData, setReasonModalData] = useState<{
    staffId: number;
    staffName: string;
    dateStr: string;
    currentStatus: "present" | "late" | "absent";
    currentReason?: string;
  } | null>(null);
  const [absenceReasonInput, setAbsenceReasonInput] = useState("");

  // Excel Preview Modals State
  const [showDailyPreview, setShowDailyPreview] = useState(false);
  const [showMonthlyPreview, setShowMonthlyPreview] = useState(false);

  // Filters and Search
  const [branchFilter, setBranchFilter] = useState(() => {
    const hanoiBranch = initialData.branchStats.find(b => 
      b.branchName.toLowerCase().includes("hà nội")
    );
    return hanoiBranch ? hanoiBranch.branchId : "all";
  });
  const [statusFilter, setStatusFilter] = useState("all"); // all, present, absent
  const [searchQuery, setSearchQuery] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch monthly data
  const fetchMonthlyData = (monthStr: string) => {
    setErrorMonthly("");
    startLoadingMonthly(async () => {
      try {
        const result = await getAdminMonthlyAttendance(monthStr);
        if ("error" in result) {
          setErrorMonthly(result.error || "Không thể tải dữ liệu điểm danh tháng");
        } else {
          setMonthlyData(result);
        }
      } catch {
        setErrorMonthly("Có lỗi xảy ra khi tải dữ liệu");
      }
    });
  };

  useEffect(() => {
    if (subTab === "monthly") {
      fetchMonthlyData(selectedMonth);
    }
  }, [selectedMonth, subTab]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    startTransition(async () => {
      const result = await getAdminDashboardData(newDate);
      if (!("error" in result)) {
        setDailyData(result);
      }
    });
  };

  // Individual action click handlers
  const handleMarkPresentClick = async (row: AdminStaffRow) => {
    addToggling(row.id, selectedDate);
    const originalDailyData = dailyData;
    const now = new Date();
    const checkInTimeStr = now.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });

    setDailyData((prev) => ({
      ...prev,
      staff: prev.staff.map((s) =>
        s.id === row.id
          ? { ...s, hasReport: true, isLate: false, absence_reason: undefined, check_in_time: checkInTimeStr }
          : s
      ),
    }));

    try {
      const res = await markStaffPresent(row.id, selectedDate, row.profile_id);
      if ("error" in res) {
        setDailyData(originalDailyData);
        window.alert(res.error);
      } else if (res.staffUpdate) {
        commitStaffUpdate(res.staffUpdate, selectedDate);
      }
    } catch {
      setDailyData(originalDailyData);
      window.alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      removeToggling(row.id, selectedDate);
    }
  };

  const handleMarkLateClick = async (row: AdminStaffRow) => {
    addToggling(row.id, selectedDate);
    const originalDailyData = dailyData;
    const now = new Date();
    const checkInTimeStr = now.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });

    setDailyData((prev) => ({
      ...prev,
      staff: prev.staff.map((s) =>
        s.id === row.id
          ? { ...s, hasReport: true, isLate: true, absence_reason: undefined, check_in_time: checkInTimeStr }
          : s
      ),
    }));

    try {
      const res = await markStaffLate(row.id, selectedDate, undefined, row.profile_id);
      if ("error" in res) {
        setDailyData(originalDailyData);
        window.alert(res.error);
      } else if (res.staffUpdate) {
        commitStaffUpdate(res.staffUpdate, selectedDate);
      }
    } catch {
      setDailyData(originalDailyData);
      window.alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      removeToggling(row.id, selectedDate);
    }
  };

  const handleMarkAbsentClick = (row: AdminStaffRow) => {
    setAbsenceReasonInput(row.absence_reason || "");
    setReasonModalData({
      staffId: row.id,
      staffName: row.full_name,
      dateStr: selectedDate,
      currentStatus: "absent",
      currentReason: row.absence_reason,
    });
    setReasonModalOpen(true);
  };

  // Inline reason editing handlers
  const startEditingReason = (row: AdminStaffRow) => {
    if (row.hasReport || selectedDayOffInfo.isOff) return;
    setEditingStaffId(row.id);
    setEditingReasonText(row.absence_reason || "");
  };

  const handleSaveInlineReason = async (staffId: number) => {
    setEditingStaffId(null);
    addToggling(staffId, selectedDate);

    const originalDailyData = dailyData;
    const row = dailyData.staff.find((s) => s.id === staffId);
    const trimmedReason = editingReasonText.trim();

    setDailyData((prev) => ({
      ...prev,
      staff: prev.staff.map((s) =>
        s.id === staffId
          ? {
              ...s,
              hasReport: false,
              isLate: false,
              absence_reason: trimmedReason || undefined,
              check_in_time: undefined,
            }
          : s
      ),
    }));

    try {
      const res = await markStaffAbsent(staffId, selectedDate, editingReasonText, row?.profile_id);
      if ("error" in res) {
        setDailyData(originalDailyData);
        window.alert(res.error);
      } else if (res.staffUpdate) {
        commitStaffUpdate(res.staffUpdate, selectedDate);
      }
    } catch {
      setDailyData(originalDailyData);
      window.alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      removeToggling(staffId, selectedDate);
    }
  };

  const handleCancelInlineReason = () => {
    setEditingStaffId(null);
  };

  const handleMonthlyCellClick = (row: MonthlyAttendanceStaffRow, dateStr: string, att: any) => {
    const isPresent = !!att?.hasReport;
    const isLate = !!att?.isLate;
    const status = !isPresent ? "absent" : (isLate ? "late" : "present");
    setAbsenceReasonInput(status === "absent" ? (att?.absenceReason || "") : "");
    setReasonModalData({
      staffId: row.id,
      staffName: row.full_name,
      dateStr,
      currentStatus: status,
      currentReason: att?.absenceReason,
    });
    setReasonModalOpen(true);
  };

  const handleSaveAttendanceModal = async () => {
    if (!reasonModalData) return;
    const { staffId, dateStr, currentStatus } = reasonModalData;
    const staffRow = dailyData.staff.find((s) => s.id === staffId);
    setReasonModalOpen(false);
    addToggling(staffId, dateStr);

    const originalDailyData = dailyData;
    const originalMonthlyData = monthlyData;

    const now = new Date();
    const checkInTimeStr = now.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });

    const optimisticUpdate: StaffAttendanceUpdate = 
      currentStatus === "present"
        ? {
            staffId,
            hasReport: true,
            isLate: false,
            tasks: [],
            check_in_time: checkInTimeStr,
            absence_reason: undefined,
            profile_id: staffRow?.profile_id,
          }
        : currentStatus === "late"
        ? {
            staffId,
            hasReport: true,
            isLate: true,
            tasks: [],
            check_in_time: checkInTimeStr,
            absence_reason: undefined,
            profile_id: staffRow?.profile_id,
          }
        : {
            staffId,
            hasReport: false,
            isLate: false,
            tasks: [],
            check_in_time: undefined,
            absence_reason: absenceReasonInput.trim() || undefined,
            profile_id: staffRow?.profile_id,
          };

    if (dateStr === selectedDate) {
      setDailyData((prev) => applyStaffAttendanceUpdate(prev, optimisticUpdate));
    }
    if (monthlyData) {
      setMonthlyData((prev) =>
        prev ? applyMonthlyAttendanceUpdate(prev, optimisticUpdate, dateStr) : prev,
      );
    }

    try {
      const res = 
        currentStatus === "present"
          ? await markStaffPresent(staffId, dateStr, staffRow?.profile_id)
          : currentStatus === "late"
          ? await markStaffLate(staffId, dateStr, undefined, staffRow?.profile_id)
          : await markStaffAbsent(staffId, dateStr, absenceReasonInput, staffRow?.profile_id);

      if ("error" in res) {
        setDailyData(originalDailyData);
        setMonthlyData(originalMonthlyData);
        window.alert(res.error);
        return;
      }

      if (res.staffUpdate) {
        commitStaffUpdate(res.staffUpdate, dateStr);
      }
    } catch {
      setDailyData(originalDailyData);
      setMonthlyData(originalMonthlyData);
      window.alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      removeToggling(staffId, dateStr);
    }
  };

  // Filter daily staff list
  const filteredDailyStaff = useMemo(() => {
    return dailyData.staff.filter((s) => {
      if (branchFilter !== "all" && s.branch_id !== branchFilter) return false;
      if (statusFilter === "present" && (!s.hasReport || s.isLate)) return false;
      if (statusFilter === "late" && (!s.hasReport || !s.isLate)) return false;
      if (statusFilter === "absent" && s.hasReport) return false;
      
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
  }, [dailyData.staff, branchFilter, statusFilter, searchQuery]);

  // Filter monthly staff list
  const filteredMonthlyStaff = useMemo(() => {
    if (!monthlyData) return [];
    return monthlyData.staff.filter((s) => {
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
  }, [monthlyData, branchFilter, searchQuery]);

  // Present/Absent/Late counts for current daily data (filtered by selected branch)
  const { dailyTotalCount, dailyPresentCount, dailyLateCount, dailyAbsentCount } = useMemo(() => {
    const branchStaff = dailyData.staff.filter((s) => {
      if (branchFilter !== "all" && s.branch_id !== branchFilter) return false;
      return true;
    });
    const present = branchStaff.filter((s) => s.hasReport && !s.isLate).length;
    const late = branchStaff.filter((s) => s.hasReport && s.isLate).length;
    const absent = branchStaff.filter((s) => !s.hasReport).length;
    return {
      dailyTotalCount: branchStaff.length,
      dailyPresentCount: present,
      dailyLateCount: late,
      dailyAbsentCount: absent,
    };
  }, [dailyData.staff, branchFilter]);

  // Excel Downloads after preview confirm
  const handleConfirmExportMonthlyExcel = async () => {
    if (!monthlyData) return;
    setShowMonthlyPreview(false);
    try {
      const filename = `Bang_cong_diem_danh_${selectedMonth}.xlsx`;
      await downloadAdminAttendanceExcel(filename, {
        month: selectedMonth,
        staff: monthlyData.staff,
        branchFilter,
      });
    } catch {
      window.alert("Không xuất được Excel. Vui lòng thử lại.");
    }
  };

  const handleConfirmExportDailyExcel = async () => {
    setShowDailyPreview(false);
    try {
      const filename = `Diem_danh_ngay_${selectedDate}.xlsx`;
      await downloadDailyAttendanceExcel(filename, {
        date: selectedDate,
        staff: dailyData.staff,
        branchFilter,
      });
    } catch {
      window.alert("Không xuất được Excel. Vui lòng thử lại.");
    }
  };

  const getDaysInMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  };

  const daysInSelectedMonth = useMemo(() => {
    return getDaysInMonth(selectedMonth);
  }, [selectedMonth]);

  const allDaysInSelectedMonth = useMemo(() => {
    const days: number[] = [];
    for (let day = 1; day <= daysInSelectedMonth; day++) {
      days.push(day);
    }
    return days;
  }, [daysInSelectedMonth]);

  const workingDaysInMonth = useMemo(() => {
    const days: number[] = [];
    for (let day = 1; day <= daysInSelectedMonth; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
      if (!isDateOff(dateStr).isOff) {
        days.push(day);
      }
    }
    return days;
  }, [selectedMonth, daysInSelectedMonth, isDateOff]);

  const getDayOfWeekLabel = (day: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return {
      label: dayNames[date.getDay()],
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    };
  };

  const getStaffPresentCount = useCallback(
    (row: MonthlyAttendanceStaffRow) => {
      let count = 0;
      for (let day = 1; day <= daysInSelectedMonth; day++) {
        const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
        const isOff = isDateOff(dateStr).isOff;
        const att = row.attendanceMap[dateStr];
        if (att?.hasReport && !isOff) {
          count++;
        }
      }
      return count;
    },
    [daysInSelectedMonth, selectedMonth, isDateOff],
  );

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    return `Tháng ${month}/${year}`;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Tab bar and header controls */}
      <div className="border-b border-slate-200/90 px-4 py-2.5 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-white">
        <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200/60 self-start shrink-0">
          <button
            onClick={() => setSubTab("daily")}
            className={`px-3 py-1 rounded text-xs transition-all cursor-pointer ${
              subTab === "daily"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            Điểm danh ngày
          </button>
          <button
            onClick={() => setSubTab("monthly")}
            className={`px-3 py-1 rounded text-xs transition-all cursor-pointer ${
              subTab === "monthly"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            Bảng công tháng
          </button>
        </div>

        {/* Global / Shared Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {subTab === "daily" ? (
            <>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className={`${adminControlClass} flex items-center justify-center gap-2 cursor-pointer`}
              >
                <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="truncate">{formatDateButtonLabel(selectedDate)}</span>
              </button>

              <button
                onClick={() => setShowDailyPreview(true)}
                className="h-9 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 shadow-2xs cursor-pointer px-3.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Xuất Excel</span>
              </button>
              
              <AdminSelect
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-40 sm:w-44"
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "present", label: "Đi làm" },
                  { value: "late", label: "Đi muộn" },
                  { value: "absent", label: "Vắng" },
                ]}
              />
            </>
          ) : (
            <>
              {/* Month Picker */}
              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                  className={`${adminControlClass} px-3 pr-8 w-40 sm:w-44 focus:ring-primary/25 cursor-pointer`}
                />
              </div>

              {monthlyData && (
                <button
                  onClick={() => setShowMonthlyPreview(true)}
                  className="h-9 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 shadow-2xs cursor-pointer px-3.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Xuất bảng công</span>
                </button>
              )}
            </>
          )}

          <AdminSelect
            value={branchFilter}
            onChange={setBranchFilter}
            className="w-40 sm:w-44"
            options={[
              { value: "all", label: "Tất cả chi nhánh" },
              ...dailyData.branchStats.map((b) => ({
                value: b.branchId,
                label: b.branchName,
              })),
            ]}
          />

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="h-9 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer px-3 transition-colors shrink-0"
            title="Cài đặt tùy chọn ngày nghỉ & Chủ nhật"
          >
            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Cài đặt ngày nghỉ</span>
          </button>

          {/* Search bar */}
          <div className="relative w-44 sm:w-52">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Tìm tên nhân viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-md border border-slate-200 bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/25 transition-all text-xs font-normal text-slate-900 placeholder:text-slate-400 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {subTab === "daily" ? (
          <div className="flex flex-col min-h-0">
            {/* Daily Day-Off Banner */}
            {selectedDayOffInfo.isOff && (
              <div className="mx-4 mt-3 bg-amber-50/90 border border-amber-200 rounded-md px-3.5 py-2 flex items-center justify-between shadow-2xs animate-fade-in">
                <div className="flex items-center gap-2 text-amber-900 font-medium text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span>
                    {formatDateButtonLabel(selectedDate)} là <strong>{selectedDayOffInfo.reason || "Ngày nghỉ"}</strong> — Thao tác điểm danh đã bị vô hiệu hóa
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300/70 uppercase shrink-0">
                  Ngày nghỉ
                </span>
              </div>
            )}

            {/* Daily Stat Row */}
            <div className="px-4 py-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50/70 rounded-lg p-2.5 sm:p-3 border border-slate-200/70 flex items-center gap-3 transition-colors hover:bg-slate-50">
                <div className="w-8 h-8 rounded-md bg-white border border-slate-200/80 text-slate-500 flex items-center justify-center shrink-0 shadow-2xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider leading-none">Tổng nhân sự</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 leading-none mt-1">{dailyTotalCount}</p>
                </div>
              </div>
              <div className="bg-slate-50/70 rounded-lg p-2.5 sm:p-3 border border-slate-200/70 flex items-center gap-3 transition-colors hover:bg-slate-50">
                <div className="w-8 h-8 rounded-md bg-emerald-50/90 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider leading-none">Đi làm</p>
                  <p className="text-lg sm:text-xl font-bold text-emerald-600 leading-none mt-1">{dailyPresentCount}</p>
                </div>
              </div>
              <div className="bg-slate-50/70 rounded-lg p-2.5 sm:p-3 border border-slate-200/70 flex items-center gap-3 transition-colors hover:bg-slate-50">
                <div className="w-8 h-8 rounded-md bg-amber-50/90 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider leading-none">Đi muộn</p>
                  <p className="text-lg sm:text-xl font-bold text-amber-600 leading-none mt-1">{dailyLateCount}</p>
                </div>
              </div>
              <div className="bg-slate-50/70 rounded-lg p-2.5 sm:p-3 border border-slate-200/70 flex items-center gap-3 transition-colors hover:bg-slate-50">
                <div className="w-8 h-8 rounded-md bg-rose-50/90 border border-rose-200/60 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider leading-none">Vắng</p>
                  <p className="text-lg sm:text-xl font-bold text-rose-600 leading-none mt-1">{dailyAbsentCount}</p>
                </div>
              </div>
            </div>

            {/* Daily Table list */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-200/90 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-2.5">Nhân viên</th>
                    <th className="px-4 py-2.5">Chi nhánh</th>
                    <th className="px-4 py-2.5">Bộ phận / Chức vụ</th>
                    <th className="px-4 py-2.5 text-center">Giờ điểm danh</th>
                    <th className="px-4 py-2.5 text-center">Trạng thái</th>
                    <th className="px-4 py-2.5">Lý do vắng</th>
                    <th className="px-4 py-2.5 text-center w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isPending ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="text-slate-400 font-medium">Đang tải danh sách...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDailyStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 italic font-medium">
                        Không tìm thấy nhân sự phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredDailyStaff.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-900 flex items-center gap-2.5">
                          <span className="w-6.5 h-6.5 rounded-md bg-slate-50 flex items-center justify-center border border-slate-200/80 shrink-0 overflow-hidden p-0.5 shadow-2xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/logo/Icon.png"
                              alt={row.full_name}
                              className="w-full h-full object-contain"
                            />
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900 text-[13px] leading-tight">{row.full_name}</p>
                            <p className="text-[11px] text-slate-500 font-mono leading-tight">ID: {row.id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 text-[13px] font-normal">{row.branch_name}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-900 text-[13px] leading-tight">{row.department || "—"}</p>
                          <p className="text-[11px] text-slate-500 font-normal leading-tight">{row.position || "—"}</p>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {row.check_in_time ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 bg-slate-100/90 border border-slate-200/70 font-mono">
                              {row.check_in_time}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal select-none">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {row.hasReport && !row.isLate ? (
                            <span className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-800 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              Đi làm
                            </span>
                          ) : row.hasReport && row.isLate ? (
                            <span className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-800 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              Đi muộn
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-800 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              Vắng mặt
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-normal text-slate-700 text-xs">
                          {row.hasReport ? (
                            <span className="text-slate-300 font-normal select-none">—</span>
                          ) : editingStaffId === row.id ? (
                            <input
                              type="text"
                              autoFocus
                              value={editingReasonText}
                              onChange={(e) => setEditingReasonText(e.target.value)}
                              onBlur={() => handleSaveInlineReason(row.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveInlineReason(row.id);
                                } else if (e.key === "Escape") {
                                  handleCancelInlineReason();
                                }
                              }}
                              placeholder="Nhập lý do..."
                              className="w-full bg-white border border-primary/40 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary/30 text-xs font-normal text-slate-900 placeholder:italic placeholder:font-normal placeholder:text-slate-400 shadow-2xs"
                            />
                          ) : row.absence_reason &&
                            row.absence_reason !== "Vắng" &&
                            row.absence_reason !== "Vắng mặt" &&
                            row.absence_reason !== "Nghỉ" ? (
                            <button
                              type="button"
                              onClick={() => startEditingReason(row)}
                              title="Bấm để chỉnh sửa lý do"
                              className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 hover:bg-slate-200/70 px-2 py-0.5 rounded text-[11px] border border-slate-200 font-medium transition-colors cursor-pointer text-left group"
                            >
                              <span>{row.absence_reason}</span>
                              <svg className="w-2.5 h-2.5 text-slate-400 group-hover:text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditingReason(row)}
                              title="Bấm để nhập lý do vắng"
                              className="text-slate-500 italic text-[11px] font-normal hover:text-slate-700 transition-colors cursor-pointer text-left block"
                            >
                              Không phép / Chưa báo cáo
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {selectedDayOffInfo.isOff ? (
                            <span
                              title={`${selectedDayOffInfo.reason || "Ngày nghỉ"} — Thao tác điểm danh bị vô hiệu hóa`}
                              className="inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200/70 cursor-not-allowed select-none opacity-80 whitespace-nowrap"
                            >
                              Ngày nghỉ
                            </span>
                          ) : isCellToggling(row.id, selectedDate) ? (
                            <span className="inline-flex items-center justify-center w-7 h-7">
                              <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            </span>
                          ) : row.hasReport && !row.isLate ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleMarkLateClick(row)}
                                title="Đổi sang Đi muộn"
                                aria-label="Đổi sang Đi muộn"
                                className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-amber-700 hover:bg-amber-50/60 hover:border-amber-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkAbsentClick(row)}
                                title="Báo Vắng mặt"
                                aria-label="Báo Vắng mặt"
                                className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-rose-700 hover:bg-rose-50/60 hover:border-rose-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : row.hasReport && row.isLate ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleMarkPresentClick(row)}
                                title="Đổi sang Đi làm đúng giờ"
                                aria-label="Đổi sang Đi làm"
                                className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkAbsentClick(row)}
                                title="Báo Vắng mặt"
                                aria-label="Báo Vắng mặt"
                                className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-rose-700 hover:bg-rose-50/60 hover:border-rose-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleMarkPresentClick(row)}
                                title="Điểm danh Đi làm"
                                aria-label="Điểm danh Đi làm"
                                className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkLateClick(row)}
                                title="Điểm danh Đi muộn"
                                aria-label="Điểm danh Đi muộn"
                                className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-amber-700 hover:bg-amber-50/60 hover:border-amber-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 h-full">
            {errorMonthly && (
              <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-md text-xs font-semibold">
                {errorMonthly}
              </div>
            )}

            {loadingMonthly && !monthlyData ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs text-slate-400 font-medium">Đang kết xuất dữ liệu bảng công...</span>
              </div>
            ) : monthlyData ? (
              <div className="flex flex-col min-h-0 flex-1">
                {/* Stats Summary strip */}
                <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                  <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
                    {formatMonthLabel(selectedMonth)} · <span className="text-slate-500 font-normal normal-case">{filteredMonthlyStaff.length} nhân sự ({workingDaysInMonth.length} ngày làm việc)</span>
                  </span>
                  <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><strong className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/70 px-1 rounded">x</strong> Đi làm</span>
                    <span className="inline-flex items-center gap-1"><strong className="text-amber-700 font-bold bg-amber-50 border border-amber-200/70 px-1 rounded">M</strong> Đi muộn</span>
                    <span className="inline-flex items-center gap-1"><strong className="text-rose-700 font-bold bg-rose-50 border border-rose-200/70 px-1 rounded">P</strong> Nghỉ phép</span>
                    <span className="inline-flex items-center gap-1"><strong className="text-rose-700 font-bold bg-rose-50 border border-rose-200/70 px-1 rounded">V</strong> Vắng</span>
                    <span className="inline-flex items-center gap-1 text-slate-400">• Tương lai</span>
                    <span className="inline-flex items-center gap-1 text-slate-400">— Ngày nghỉ</span>
                  </div>
                </div>

                {/* Timesheet Grid */}
                <div className="overflow-auto flex-1 no-scrollbar">
                  <table className="w-full border-collapse text-left text-xs whitespace-nowrap table-fixed">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-slate-200/90 bg-slate-50/90 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="px-3 py-2.5 w-48 sticky left-0 bg-slate-50/95 z-20 border-r border-slate-200/80">Nhân viên</th>
                        <th className="px-3 py-2.5 w-28 text-center">Chi nhánh</th>
                        <th className="px-3 py-2.5 w-28 text-center">Bộ phận</th>
                        {/* Day headers */}
                        {allDaysInSelectedMonth.map((day) => {
                          const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                          const dayOffInfo = isDateOff(dateStr);
                          const { label, isWeekend } = getDayOfWeekLabel(day);
                          return (
                            <th
                              key={day}
                              title={dayOffInfo.reason}
                              className={`px-1 py-1.5 text-center w-8 border-r border-slate-200/70 leading-tight ${
                                dayOffInfo.isOff
                                  ? "bg-slate-100/90 text-slate-500 font-bold"
                                  : isWeekend
                                    ? "bg-amber-50/70 text-amber-700"
                                    : ""
                              }`}
                            >
                              <div className="font-mono text-[11px]">{day}</div>
                              <div className={`text-[8px] font-medium ${dayOffInfo.isOff ? "text-amber-700 font-bold" : "text-slate-400"}`}>
                                {dayOffInfo.isWeeklyOff ? label : dayOffInfo.isOff ? "Nghỉ" : label}
                              </div>
                            </th>
                          );
                        })}
                        <th className="px-3 py-2.5 w-20 text-center sticky right-0 bg-slate-50/95 z-20 border-l border-slate-200/80">Số công</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMonthlyStaff.length === 0 ? (
                        <tr>
                          <td colSpan={4 + allDaysInSelectedMonth.length} className="text-center py-12 text-slate-400 italic font-medium">
                            Không tìm thấy nhân sự phù hợp
                          </td>
                        </tr>
                      ) : (
                        filteredMonthlyStaff.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Staff info sticky column */}
                            <td className="px-3 py-2 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200/80 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center border border-slate-200/80 shrink-0 overflow-hidden p-0.5 shadow-2xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src="/logo/Icon.png"
                                  alt={row.full_name}
                                  className="w-full h-full object-contain"
                                />
                              </span>
                              <div className="truncate">
                                <p className="font-semibold text-slate-900 text-xs truncate leading-tight">{row.full_name}</p>
                                <p className="text-[10px] text-slate-500 font-normal truncate leading-tight">{row.position || "—"}</p>
                              </div>
                            </td>

                            <td className="px-3 py-2 text-center text-slate-700 text-xs font-normal truncate">{row.branch_name}</td>
                            <td className="px-3 py-2 text-center text-slate-700 text-xs font-normal truncate">{row.department || "—"}</td>

                            {/* Calendar columns */}
                            {allDaysInSelectedMonth.map((day) => {
                              const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                              const dayOffInfo = isDateOff(dateStr);
                              const att = row.attendanceMap[dateStr];
                              const { isWeekend } = getDayOfWeekLabel(day);
                              const isCellTogglingMonthly = isCellToggling(row.id, dateStr);

                              // Disabled UI for off-days
                              if (dayOffInfo.isOff) {
                                return (
                                  <td
                                    key={day}
                                    title={`${dayOffInfo.reason || "Ngày nghỉ"} — Vô hiệu hóa điểm danh`}
                                    className="px-1 py-2 text-center border-r border-slate-100 text-[10px] bg-slate-100/60 text-slate-300 font-bold select-none cursor-not-allowed"
                                  >
                                    <span className="block w-full text-center text-slate-300 select-none font-normal">—</span>
                                  </td>
                                );
                              }

                              const isFuture = dateStr > todayStr;
                              let cellClass = "px-1 py-2 text-center border-r border-slate-100 text-xs font-bold cursor-pointer transition-all select-none ";
                              
                              if (isCellTogglingMonthly) {
                                cellClass += "hover:bg-primary/5";
                              } else {
                                cellClass += isWeekend ? "bg-amber-50/20 hover:bg-primary/5" : "bg-white hover:bg-primary/5";
                              }

                              return (
                                <td
                                  key={day}
                                  onClick={() => !isCellTogglingMonthly && handleMonthlyCellClick(row, dateStr, att)}
                                  title={
                                    att?.hasReport
                                      ? att.isLate
                                        ? `${row.full_name} đi muộn lúc ${att.checkInTime || "—"}. Click để chỉnh sửa.`
                                        : `${row.full_name} đi làm lúc ${att.checkInTime || "—"}. Click để chỉnh sửa.`
                                      : att?.absenceReason
                                        ? `${row.full_name} vắng (Nghỉ phép): ${att.absenceReason}. Click để chỉnh sửa.`
                                        : `${row.full_name} vắng không phép. Click để chỉnh sửa.`
                                  }
                                  className={cellClass}
                                >
                                  {isCellTogglingMonthly ? (
                                    <span className="flex items-center justify-center w-full">
                                      <svg className="animate-spin h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    </span>
                                  ) : isFuture ? (
                                    <span className="text-slate-200 block w-full text-center hover:text-slate-400">•</span>
                                  ) : att?.hasReport ? (
                                    att.isLate ? (
                                      <span className="text-amber-600 font-bold block w-full text-center">M</span>
                                    ) : (
                                      <span className="text-emerald-600 font-bold block w-full text-center">x</span>
                                    )
                                  ) : (
                                    <span className="text-rose-600 font-bold block w-full text-center">
                                      {att?.absenceReason ? "P" : "V"}
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Total days present sticky column */}
                            <td className="px-3 py-2 text-center font-bold text-slate-900 sticky right-0 bg-white z-10 border-l border-slate-200/80 text-xs font-mono">
                              {getStaffPresentCount(row)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 italic font-medium">
                Chưa có dữ liệu cho tháng này. Vui lòng thử chọn tháng khác.
              </div>
            )}
          </div>
        )}
      </div>

      <DatePickerModal
        open={showDatePicker}
        value={selectedDate}
        onClose={() => setShowDatePicker(false)}
        onSelect={handleDateChange}
        title="Chọn ngày xem điểm danh"
        isDateDisabled={(d) => isDateOff(d).isOff}
        disabledReason={(d) => isDateOff(d).reason}
      />

      {/* Off Day Settings Modal */}
      <OffDaySettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={offDaySettings}
        onSave={updateOffDaySettings}
      />

      {/* Manual Status Toggling Modal */}
      {reasonModalOpen && reasonModalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print animate-fade-in">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-4 sm:p-4.5 max-w-[340px] w-full flex flex-col animate-slide-in space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="min-w-0 pr-2">
                <h3 className="font-semibold text-slate-900 text-sm leading-tight">Cập nhật điểm danh</h3>
                <p className="text-xs text-slate-500 font-normal leading-tight mt-0.5 truncate">
                  {reasonModalData.staffName} · Ngày {formatDateButtonLabel(reasonModalData.dateStr)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReasonModalOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Segmented Status Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Trạng thái</label>
              <div className="p-0.5 bg-slate-100 rounded-md border border-slate-200/70 grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setReasonModalData(prev => prev ? { ...prev, currentStatus: "present" } : null);
                  }}
                  className={`h-8.5 rounded text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                    reasonModalData.currentStatus === "present"
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 font-medium"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Đi làm</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReasonModalData(prev => prev ? { ...prev, currentStatus: "late" } : null);
                  }}
                  className={`h-8.5 rounded text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                    reasonModalData.currentStatus === "late"
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 font-medium"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Đi muộn</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReasonModalData(prev => prev ? { ...prev, currentStatus: "absent" } : null);
                  }}
                  className={`h-8.5 rounded text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                    reasonModalData.currentStatus === "absent"
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 font-medium"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>Vắng</span>
                </button>
              </div>
            </div>

            {/* Absence reason selection if marked absent */}
            {reasonModalData.currentStatus === "absent" && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Lý do vắng</label>
                <input
                  type="text"
                  placeholder="Nhập lý do vắng..."
                  value={absenceReasonInput}
                  onChange={(e) => setAbsenceReasonInput(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary/25 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs"
                />
                {/* Quick Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {["Nghỉ phép", "Ốm", "Việc riêng", "Không lý do"].map((sug) => {
                    const isSelected = sug === "Không lý do" ? absenceReasonInput === "" : absenceReasonInput === sug;
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setAbsenceReasonInput(sug === "Không lý do" ? "" : sug)}
                        className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold"
                            : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-800"
                        }`}
                      >
                        {sug}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReasonModalOpen(false)}
                className="h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium px-3.5 rounded-md text-xs transition-colors cursor-pointer shadow-2xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAttendanceModal}
                className="h-9 bg-primary text-white hover:bg-primary-hover font-semibold px-4 rounded-md text-xs transition-colors cursor-pointer shadow-2xs"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet Excel Previews */}
      {showDailyPreview && (
        <DailyAttendancePreviewModal
          open={showDailyPreview}
          onClose={() => setShowDailyPreview(false)}
          onConfirm={handleConfirmExportDailyExcel}
          selectedDate={selectedDate}
          staff={dailyData.staff}
          branchFilter={branchFilter}
        />
      )}

      {showMonthlyPreview && monthlyData && (
        <MonthlyAttendancePreviewModal
          open={showMonthlyPreview}
          onClose={() => setShowMonthlyPreview(false)}
          onConfirm={handleConfirmExportMonthlyExcel}
          selectedMonth={selectedMonth}
          staff={monthlyData.staff}
          branchFilter={branchFilter}
        />
      )}
    </div>
  );
}

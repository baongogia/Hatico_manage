"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Profile } from "../../actions";
import {
  PeriodicReportType,
  MarketingPeriodicReport,
  PeriodicEvaluation,
  PeriodicActionPlanItem,
} from "@/lib/periodic-marketing-types";
import {
  fetchPeriodicReportsAction,
  createOrGetPeriodicReportAction,
  savePeriodicReportDraftAction,
  refreshPeriodicReportDataAction,
  closePeriodicReportAction,
  reopenPeriodicReportAction,
  deletePeriodicReportAction,
} from "@/app/actions-periodic-marketing";
import {
  getCurrentWeekNumber,
  getCurrentMonthNumber,
  getCurrentYear,
} from "@/lib/periodic-marketing-aggregator";
import { HATICO_BRANCHES } from "@/lib/marketing-types";
import { CustomSelect } from "@/components/custom-select";
import { PeriodicKpiCards } from "./periodic-kpi-cards";
import { PeriodicChannelTable } from "./periodic-channel-table";
import { PeriodicCampaignsSection } from "./periodic-campaigns-section";
import { PeriodicBranchTable } from "./periodic-branch-table";
import { PeriodicEvaluationSection } from "./periodic-evaluation-section";
import { PeriodicActionPlanSection } from "./periodic-action-plan-section";
import { PeriodicCreateModal } from "./periodic-create-modal";
import { PeriodicMarketingPrintDocument } from "./periodic-marketing-print-document";

interface WeeklyMarketingPanelProps {
  profile: Profile;
}

export function WeeklyMarketingPanel({ profile }: WeeklyMarketingPanelProps) {
  const isAdmin = profile.role === "admin";
  const [reportType, setReportType] = useState<PeriodicReportType>("weekly");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentYear());

  const [reports, setReports] = useState<MarketingPeriodicReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Editable local state during editing mode
  const [editEvaluation, setEditEvaluation] = useState<PeriodicEvaluation>({
    highlightedResults: "",
    issuesAndDifficulties: "",
    proposalsAndRecommendations: "",
  });
  const [editActionPlan, setEditActionPlan] = useState<PeriodicActionPlanItem[]>([]);

  const [isPending, startTransition] = useTransition();
  const [printMounted, setPrintMounted] = useState(false);

  useEffect(() => {
    setPrintMounted(true);
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteReport = () => {
    if (!selectedReport) return;
    const confirmName =
      selectedReport.reportType === "weekly"
        ? `Tuần ${selectedReport.periodNumber}/${selectedReport.year}`
        : `Tháng ${selectedReport.periodNumber}/${selectedReport.year}`;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn báo cáo ${confirmName}? Thao tác này không thể hoàn tác.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deletePeriodicReportAction(selectedReport.id);
      if (res.success) {
        showToast("Đã xóa báo cáo thành công!");
        setReports((prev) => prev.filter((r) => r.id !== selectedReport.id));
        setSelectedReportId("");
      } else {
        alert(res.error || "Lỗi khi xóa báo cáo!");
      }
    });
  };

  // Load reports from server
  const loadReports = (type = reportType, yr = selectedYear, br = selectedBranchId) => {
    startTransition(async () => {
      const res = await fetchPeriodicReportsAction(type, yr, br);
      if (res.success && res.reports) {
        setReports(res.reports);
        if (res.reports.length > 0) {
          // If current selected is not in filtered list, pick the first
          if (!res.reports.some((r) => r.id === selectedReportId)) {
            setSelectedReportId(res.reports[0].id);
          }
        } else {
          setSelectedReportId("");
        }
      }
    });
  };

  useEffect(() => {
    loadReports(reportType, selectedYear, selectedBranchId);
  }, [reportType, selectedYear, selectedBranchId]);

  // Selected report
  const selectedReport = useMemo(() => {
    return reports.find((r) => r.id === selectedReportId) || reports[0] || null;
  }, [reports, selectedReportId]);

  // Sync edit state when selected report changes
  useEffect(() => {
    if (selectedReport) {
      setEditEvaluation(
        selectedReport.evaluation || {
          highlightedResults: "",
          issuesAndDifficulties: "",
          proposalsAndRecommendations: "",
        }
      );
      setEditActionPlan(selectedReport.actionPlan || []);
      setIsEditing(false);
    }
  }, [selectedReport]);

  // Format short date
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  // Create new period report handler
  const handleCreateNew = async (periodNum: number, yr: number, brId: string) => {
    const res = await createOrGetPeriodicReportAction(reportType, periodNum, yr, brId);
    if (res.success && res.report) {
      showToast(
        `Đã tạo báo cáo ${reportType === "weekly" ? `Tuần ${periodNum}` : `Tháng ${periodNum}`} / ${yr} thành công!`
      );
      // Reload reports and select the newly created report
      loadReports();
      setSelectedReportId(res.report.id);
    } else {
      throw new Error(res.error || "Không thể tạo báo cáo");
    }
  };

  // Save Draft
  const handleSaveDraft = () => {
    if (!selectedReport) return;
    startTransition(async () => {
      const updatedPayload: MarketingPeriodicReport = {
        ...selectedReport,
        evaluation: editEvaluation,
        actionPlan: editActionPlan,
      };
      const res = await savePeriodicReportDraftAction(updatedPayload);
      if (res.success && res.report) {
        showToast("Đã lưu bản nháp đánh giá & kế hoạch thành công!");
        setIsEditing(false);
        setReports((prev) => prev.map((r) => (r.id === res.report.id ? res.report : r)));
      } else {
        alert(res.error || "Lỗi khi lưu bản nháp!");
      }
    });
  };

  // Refresh live source data
  const handleRefreshData = () => {
    if (!selectedReport) return;
    if (selectedReport.status === "closed") {
      alert("Báo cáo đã chốt không được cập nhật số liệu!");
      return;
    }
    startTransition(async () => {
      const res = await refreshPeriodicReportDataAction(selectedReport.id);
      if (res.success && res.report) {
        showToast("Đã cập nhật số liệu mới nhất từ các module Marketing!");
        setReports((prev) => prev.map((r) => (r.id === res.report.id ? res.report : r)));
      } else {
        alert(res.error || "Lỗi khi cập nhật số liệu!");
      }
    });
  };

  // Close report (Chốt báo cáo)
  const handleCloseReport = () => {
    if (!selectedReport) return;
    const confirmClose = window.confirm(
      `Bạn có chắc chắn muốn CHỐT báo cáo ${
        reportType === "weekly" ? `Tuần ${selectedReport.periodNumber}` : `Tháng ${selectedReport.periodNumber}`
      } / ${selectedReport.year}?\n\nSau khi chốt, số liệu sẽ được đóng băng snapshot chính thức.`
    );
    if (!confirmClose) return;

    startTransition(async () => {
      const res = await closePeriodicReportAction(selectedReport.id);
      if (res.success && res.report) {
        showToast("Báo cáo đã được chốt và lưu snapshot chính thức!");
        setIsEditing(false);
        setReports((prev) => prev.map((r) => (r.id === res.report.id ? res.report : r)));
      } else {
        alert(res.error || "Lỗi khi chốt báo cáo!");
      }
    });
  };

  // Reopen report (Mở lại báo cáo - Admin only)
  const handleReopenReport = () => {
    if (!selectedReport) return;
    if (!isAdmin) {
      alert("Chỉ Ban giám đốc / Admin mới có quyền mở lại báo cáo đã chốt!");
      return;
    }
    const note = window.prompt("Nhập lý do mở lại báo cáo đã chốt:", "Mở lại để bổ sung đánh giá");
    if (note === null) return;

    startTransition(async () => {
      const res = await reopenPeriodicReportAction(selectedReport.id, note);
      if (res.success && res.report) {
        showToast("Đã mở lại báo cáo thành bản nháp!");
        setReports((prev) => prev.map((r) => (r.id === res.report.id ? res.report : r)));
      } else {
        alert(res.error || "Lỗi khi mở lại báo cáo!");
      }
    });
  };

  // Print / Export PDF
  const handlePrint = () => {
    if (!selectedReport) return;
    const originalTitle = document.title;
    const filename =
      selectedReport.reportType === "weekly"
        ? `HATICO_BAO_CAO_MARKETING_TUAN_${selectedReport.periodNumber}_${selectedReport.year}`
        : `HATICO_BAO_CAO_MARKETING_THANG_${selectedReport.periodNumber}_${selectedReport.year}`;

    document.title = filename;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // Status Badge
  const getStatusBadge = (status: "draft" | "closed") => {
    if (status === "closed") {
      return (
        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✓ Đã chốt
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        ✎ Bản nháp
      </span>
    );
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden gap-3 print:h-auto print:overflow-visible">
      {/* Toast Alert */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-[4px] shadow-xl flex items-center gap-2 animate-slide-in no-print">
          <span>✓</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="flex flex-1 min-h-0 flex-col sm:flex-row gap-3 overflow-hidden print:h-auto print:overflow-visible">
        {/* ================= LEFT HISTORY SIDEBAR ================= */}
        <aside className="w-full sm:w-64 lg:w-72 shrink-0 flex flex-col bg-white rounded-[4px] border border-slate-200/90 shadow-2xs overflow-hidden no-print">
          {/* 1. Mode Switcher: Tuần / Tháng */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/70 rounded-[4px]">
              <button
                type="button"
                onClick={() => setReportType("weekly")}
                className={`py-1.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
                  reportType === "weekly"
                    ? "bg-white text-primary shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Báo cáo tuần
              </button>
              <button
                type="button"
                onClick={() => setReportType("monthly")}
                className={`py-1.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
                  reportType === "monthly"
                    ? "bg-white text-primary shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Báo cáo tháng
              </button>
            </div>
          </div>

          {/* 2. Filter row: Chi nhánh & Năm */}
          <div className="p-2.5 border-b border-slate-100 space-y-2 shrink-0 text-xs">
            <div>
              <span className="block text-[10px] text-slate-500 font-semibold mb-1">
                Phạm vi chi nhánh:
              </span>
              <CustomSelect
                value={selectedBranchId}
                onChange={(val) => setSelectedBranchId(String(val))}
                options={[
                  { value: "all", label: "Toàn hệ thống" },
                  ...HATICO_BRANCHES.map((b) => ({
                    value: b.id,
                    label: b.name,
                  })),
                ]}
                className="w-full"
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500 font-semibold">Năm:</span>
              <CustomSelect
                value={selectedYear}
                onChange={(val) => setSelectedYear(Number(val))}
                options={[getCurrentYear(), getCurrentYear() - 1].map((y) => ({
                  value: y,
                  label: `Năm ${y}`,
                }))}
                className="w-28"
                size="xs"
              />
            </div>
          </div>

          {/* 3. Action bar: Title & + New */}
          <div className="p-2.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/40">
            <h3 className="text-xs font-bold text-slate-800">
              Lịch sử {reportType === "weekly" ? "tuần" : "tháng"} ({reports.length})
            </h3>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-bold text-primary hover:text-primary-hover px-2.5 py-1 rounded-[4px] hover:bg-primary/10 transition-colors cursor-pointer border border-primary/20"
            >
              + {reportType === "weekly" ? "Tuần mới" : "Tháng mới"}
            </button>
          </div>

          {/* 4. Report List */}
          <div className="p-2 gap-1.5 flex flex-col flex-1 overflow-y-auto no-scrollbar">
            {reports.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                Chưa có báo cáo nào cho năm {selectedYear}. Bấm nút &quot;+&quot; ở trên để tạo báo cáo.
              </div>
            ) : (
              reports.map((rep) => {
                const isSelected = selectedReport?.id === rep.id;
                return (
                  <div
                    key={rep.id}
                    onClick={() => {
                      setSelectedReportId(rep.id);
                      setIsEditing(false);
                    }}
                    className={`p-2.5 rounded-[4px] cursor-pointer transition-colors text-left border ${
                      isSelected
                        ? "bg-primary/5 border-primary/40 text-slate-900 shadow-2xs"
                        : "border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-900">
                        {rep.reportType === "weekly"
                          ? `Tuần ${rep.periodNumber} / ${rep.year}`
                          : `Tháng ${rep.periodNumber} / ${rep.year}`}
                      </span>
                      {getStatusBadge(rep.status)}
                    </div>

                    <div className="text-[11px] text-slate-500 mb-1 flex items-center justify-between">
                      <span>
                        {formatShortDate(rep.startDate)} → {formatShortDate(rep.endDate)}
                      </span>
                      <span className="text-[10px] text-slate-400">{rep.branchName}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Người lập: {rep.creatorName}</span>
                      <span className="font-semibold text-primary">
                        {rep.data?.kpis?.totalLeads ?? 0} leads
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ================= RIGHT MAIN CONTENT AREA ================= */}
        <main className="flex-1 min-h-0 flex flex-col bg-white rounded-[4px] border border-slate-200/90 shadow-2xs overflow-hidden print:border-none print:shadow-none print:overflow-visible">
          {/* Empty state when no report selected */}
          {!selectedReport ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <span className="text-4xl mb-3">📄</span>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Chưa có báo cáo {reportType === "weekly" ? "tuần" : "tháng"} được chọn
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Chọn một báo cáo trong danh sách bên trái hoặc bấm tạo báo cáo mới cho kỳ hiện tại.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-[4px] cursor-pointer"
              >
                + Tạo báo cáo kỳ này
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {/* Header Toolbar */}
              <div className="px-5 py-3.5 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white sticky top-0 z-20 print:static print:border-b-2 print:border-slate-800 print:px-0">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight uppercase">
                      BÁO CÁO MARKETING {selectedReport.reportType === "weekly" ? "TUẦN" : "THÁNG"}{" "}
                      {selectedReport.periodNumber} / {selectedReport.year}
                    </h1>
                    {getStatusBadge(selectedReport.status)}
                  </div>

                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {formatShortDate(selectedReport.startDate)} – {formatShortDate(selectedReport.endDate)}
                    </span>
                    <span>·</span>
                    <span className="text-slate-700">{selectedReport.branchName}</span>
                    <span>·</span>
                    <span>Người lập: <strong>{selectedReport.creatorName}</strong></span>
                    {selectedReport.status === "closed" && selectedReport.closedBy && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-700">
                          Chốt bởi: <strong>{selectedReport.closedBy}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-2 no-print">
                  {/* Refresh live numbers if in draft */}
                  {selectedReport.status === "draft" && !isEditing && (
                    <button
                      type="button"
                      onClick={handleRefreshData}
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-[4px] border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                      title="Lấy lại số liệu mới nhất từ các module Marketing"
                    >
                      <span>🔄</span>
                      <span>{isPending ? "Đang tải..." : "Cập nhật số liệu"}</span>
                    </button>
                  )}

                  {/* Edit Toggle */}
                  {selectedReport.status === "draft" && (
                    <>
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-[4px] cursor-pointer"
                          >
                            Hủy sửa
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={isPending}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-[4px] cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            {isPending ? "Đang lưu..." : "Lưu bản nháp"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-[4px] border border-slate-200 cursor-pointer"
                        >
                          <span>✎</span>
                          <span>Chỉnh sửa</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Close / Reopen */}
                  {selectedReport.status === "draft" && !isEditing && (
                    <button
                      type="button"
                      onClick={handleCloseReport}
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-[4px] cursor-pointer shadow-xs disabled:opacity-50"
                      title="Chốt báo cáo và lưu snapshot số liệu"
                    >
                      <span>✓</span>
                      <span>Chốt báo cáo</span>
                    </button>
                  )}

                  {selectedReport.status === "closed" && isAdmin && (
                    <button
                      type="button"
                      onClick={handleReopenReport}
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-[4px] cursor-pointer"
                      title="Mở lại báo cáo để chỉnh sửa"
                    >
                      Mở lại báo cáo
                    </button>
                  )}

                  {/* Print / PDF */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-[4px] shadow-2xs transition-colors cursor-pointer"
                    title="In báo cáo hoặc lưu định dạng PDF khổ A4"
                  >
                    <span>🖨️</span>
                    <span>In / PDF</span>
                  </button>

                  {/* Delete Report */}
                  {(selectedReport.status === "draft" || isAdmin) && !isEditing && (
                    <button
                      type="button"
                      onClick={handleDeleteReport}
                      disabled={isPending}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-[4px] cursor-pointer transition-colors disabled:opacity-50"
                      title="Xóa báo cáo này"
                    >
                      <span>🗑️</span>
                      <span>Xóa</span>
                    </button>
                  )}
                </div>
              </div>

              {/* REPORT DOCUMENT CONTENT (The 6 Parts) */}
              <div className="p-4 sm:p-6 space-y-6 flex-1 print:p-0 print:space-y-4">
                {/* Official Print Header */}
                <div className="hidden print:flex items-center justify-between pb-4 border-b-2 border-slate-900 mb-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/logo/hatico_logo.png"
                      alt="Hatico"
                      width={130}
                      height={50}
                      className="h-10 w-auto object-contain"
                    />
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                        CÔNG TY CỔ PHẦN THIẾT BỊ VẬN TẢI HATICO VIỆT NAM
                      </h2>
                      <p className="text-[11px] text-slate-600">
                        Hệ thống Báo cáo Quản trị Doanh nghiệp Hatico Manager
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-600">
                    <p>Ngày xuất: {new Date().toLocaleDateString("vi-VN")}</p>
                    <p>Phạm vi: {selectedReport.branchName}</p>
                  </div>
                </div>

                {/* ================= PHẦN I – TỔNG QUAN KẾT QUẢ MARKETING ================= */}
                <section className="space-y-2.5 break-inside-avoid">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-l-4 border-primary pl-2.5">
                      PHẦN I – TỔNG QUAN KẾT QUẢ MARKETING
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium no-print">
                      8 Chỉ số KPIs cốt lõi
                    </span>
                  </div>

                  <PeriodicKpiCards
                    kpis={selectedReport.data?.kpis}
                    comparison={selectedReport.data?.kpiComparison}
                    reportType={selectedReport.reportType}
                  />
                </section>

                {/* ================= PHẦN II – KẾT QUẢ THEO KÊNH ================= */}
                <section className="space-y-2.5 break-inside-avoid">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-l-4 border-primary pl-2.5">
                    PHẦN II – KẾT QUẢ THEO KÊNH & NỘI DUNG
                  </h3>

                  <PeriodicChannelTable
                    channels={selectedReport.data?.channelResults || []}
                    totals={
                      selectedReport.data?.channelTotals || {
                        contentCount: 0,
                        views: 0,
                        interactions: 0,
                        leads: 0,
                        consulted: 0,
                        converted: 0,
                        orders: 0,
                      }
                    }
                    topContents={selectedReport.data?.topContents || []}
                  />
                </section>

                {/* ================= PHẦN III – BÁO CÁO CHIẾN DỊCH QUẢNG CÁO ================= */}
                <section className="space-y-2.5 break-inside-avoid">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-l-4 border-primary pl-2.5">
                    PHẦN III – BÁO CÁO CHIẾN DỊCH QUẢNG CÁO (ADS)
                  </h3>

                  <PeriodicCampaignsSection
                    facebookAds={
                      selectedReport.data?.facebookAds || {
                        platform: "facebook_ads",
                        platformName: "Facebook Ads",
                        activeCampaignsCount: 0,
                        totalCost: 0,
                        leads: 0,
                        consulted: 0,
                        converted: 0,
                        orders: 0,
                        cpl: null,
                        campaigns: [],
                      }
                    }
                    tiktokAds={
                      selectedReport.data?.tiktokAds || {
                        platform: "tiktok_ads",
                        platformName: "TikTok Ads",
                        activeCampaignsCount: 0,
                        totalCost: 0,
                        leads: 0,
                        consulted: 0,
                        converted: 0,
                        orders: 0,
                        cpl: null,
                        campaigns: [],
                      }
                    }
                    adComparison={
                      selectedReport.data?.adComparison || {
                        facebook: { cost: 0, leads: 0, consulted: 0, converted: 0, orders: 0, cpl: null },
                        tiktok: { cost: 0, leads: 0, consulted: 0, converted: 0, orders: 0, cpl: null },
                        total: { cost: 0, leads: 0, consulted: 0, converted: 0, orders: 0, cpl: null },
                      }
                    }
                  />
                </section>

                {/* ================= PHẦN IV – KẾT QUẢ THEO CHI NHÁNH ================= */}
                <section className="space-y-2.5 break-inside-avoid">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-l-4 border-primary pl-2.5">
                    PHẦN IV – KẾT QUẢ THEO CHI NHÁNH
                  </h3>

                  <PeriodicBranchTable
                    branchResults={selectedReport.data?.branchResults || []}
                    totalSystem={
                      selectedReport.data?.totalSystemBranch || {
                        branchId: "all",
                        branchName: "Toàn hệ thống",
                        contentCount: 0,
                        leads: 0,
                        consulted: 0,
                        converted: 0,
                        orders: 0,
                        adSpend: 0,
                      }
                    }
                  />
                </section>

                {/* ================= PHẦN V – ĐÁNH GIÁ HOẠT ĐỘNG MARKETING ================= */}
                <section className="space-y-2.5 break-inside-avoid">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-l-4 border-primary pl-2.5">
                      PHẦN V – ĐÁNH GIÁ HOẠT ĐỘNG MARKETING
                    </h3>
                    {isEditing && (
                      <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-[4px] border border-amber-200">
                        Đang ở chế độ chỉnh sửa đánh giá
                      </span>
                    )}
                  </div>

                  <PeriodicEvaluationSection
                    evaluation={isEditing ? editEvaluation : selectedReport.evaluation}
                    isEditing={isEditing}
                    onChange={setEditEvaluation}
                  />
                </section>

                {/* ================= PHẦN VI – KẾ HẠCH KỲ TIẾP THEO ================= */}
                <section className="space-y-2.5 break-inside-avoid">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-l-4 border-primary pl-2.5">
                      PHẦN VI – KẾ HẠCH CÔNG VIỆC KỲ TIẾP THEO
                    </h3>
                    {isEditing && (
                      <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-[4px] border border-amber-200">
                        Đang ở chế độ chỉnh sửa kế hoạch
                      </span>
                    )}
                  </div>

                  <PeriodicActionPlanSection
                    actionPlan={isEditing ? editActionPlan : selectedReport.actionPlan}
                    isEditing={isEditing}
                    onChange={setEditActionPlan}
                  />
                </section>

                {/* Print Signatures Block */}
                <div className="hidden print:grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-300 text-center text-xs break-inside-avoid">
                  <div>
                    <p className="font-bold uppercase text-slate-900">NGƯỜI LẬP BÁO CÁO</p>
                    <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
                    <div className="h-16" />
                    <p className="font-bold text-slate-900">{selectedReport.creatorName}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-900">BAN GIÁM ĐỐC DUYỆT</p>
                    <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký và đóng dấu)</p>
                    <div className="h-16" />
                    <p className="font-bold text-slate-900">
                      {selectedReport.closedBy || "Ngô Gia Bảo"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal create new period */}
      <PeriodicCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        reportType={reportType}
        existingReports={reports}
        onCreate={handleCreateNew}
        onSelectExisting={(id) => {
          setSelectedReportId(id);
          setIsEditing(false);
        }}
      />

      {/* Printable Document Portal */}
      {printMounted && selectedReport && createPortal(
        <PeriodicMarketingPrintDocument report={selectedReport} />,
        document.body
      )}
    </div>
  );
}

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
  PeriodicReportDataSnapshot,
  ChannelResultRow,
  TopContentItem,
  BranchResultRow,
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
import {
  PeriodicCreateModal,
  CreatePeriodicReportParams,
} from "./periodic-create-modal";
import { PeriodicMarketingPrintDocument } from "./periodic-marketing-print-document";
import { exportPeriodicMarketingReportExcel } from "@/lib/periodic-marketing-export";

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
  const [spanFilter, setSpanFilter] = useState<string>("all");
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
  const [editData, setEditData] = useState<PeriodicReportDataSnapshot | null>(null);

  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("all");
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Custom Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenNote, setReopenNote] = useState("Mở lại để bổ sung số liệu");

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
    setShowDeleteModal(true);
  };

  const confirmDeleteReport = () => {
    if (!selectedReport) return;
    startTransition(async () => {
      const res = await deletePeriodicReportAction(selectedReport.id);
      if (res.success) {
        showToast("Đã xóa báo cáo thành công!");
        setReports((prev) => prev.filter((r) => r.id !== selectedReport.id));
        setSelectedReportId("");
        setShowDeleteModal(false);
      } else {
        showToast(res.error || "Lỗi khi xóa báo cáo!");
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

  // Filtered reports by span filter (for weekly: 1 week, 2 weeks, 3 weeks)
  const displayedReports = useMemo(() => {
    return reports.filter((r) => {
      if (reportType === "weekly" && spanFilter !== "all") {
        if (spanFilter === "1") return !r.periodSpan || r.periodSpan === 1;
        if (spanFilter === "2") return r.periodSpan === 2;
        if (spanFilter === "3") return r.periodSpan === 3;
      }
      return true;
    });
  }, [reports, reportType, spanFilter]);

  // Selected report
  const selectedReport = useMemo(() => {
    return displayedReports.find((r) => r.id === selectedReportId) || displayedReports[0] || null;
  }, [displayedReports, selectedReportId]);

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
      setEditData(selectedReport.data ? JSON.parse(JSON.stringify(selectedReport.data)) : null);
      setIsEditing(false);
    }
  }, [selectedReport]);

  const handleStartEdit = () => {
    if (selectedReport?.data) {
      setEditData(JSON.parse(JSON.stringify(selectedReport.data)));
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (selectedReport?.data) {
      setEditData(JSON.parse(JSON.stringify(selectedReport.data)));
      setEditEvaluation(
        selectedReport.evaluation || {
          highlightedResults: "",
          issuesAndDifficulties: "",
          proposalsAndRecommendations: "",
        }
      );
      setEditActionPlan(selectedReport.actionPlan || []);
    }
    setIsEditing(false);
  };

  // Channel update handler
  const handleUpdateChannel = (
    platform: "facebook" | "tiktok" | "youtube" | "website",
    field: keyof ChannelResultRow,
    value: number
  ) => {
    setEditData((prev) => {
      if (!prev) return prev;
      const nextChannels = prev.channelResults.map((ch) => {
        if (ch.platform === platform) {
          return { ...ch, [field]: value };
        }
        return ch;
      });

      const sumField = (f: keyof ChannelResultRow) =>
        nextChannels.reduce((sum, c) => sum + (Number(c[f]) || 0), 0);

      const nextTotals = {
        contentCount: sumField("contentCount"),
        views: sumField("views"),
        interactions: sumField("interactions"),
        leads: sumField("leads"),
        consulted: sumField("consulted"),
        converted: sumField("converted"),
        orders: sumField("orders"),
      };

      const totalAdSpend = prev.kpis?.totalAdSpend || 0;
      const nextKpis = {
        ...prev.kpis,
        totalContentPublished: nextTotals.contentCount,
        totalViews: nextTotals.views,
        totalInteractions: nextTotals.interactions,
        totalLeads: nextTotals.leads,
        totalConsulted: nextTotals.consulted,
        totalConverted: nextTotals.converted,
        totalOrders: nextTotals.orders,
        conversionRateConsultToOrder:
          nextTotals.consulted > 0
            ? Math.round((nextTotals.orders / nextTotals.consulted) * 1000) / 10
            : 0,
        conversionRateLeadToOrder:
          nextTotals.leads > 0
            ? Math.round((nextTotals.orders / nextTotals.leads) * 1000) / 10
            : 0,
        costPerLead: nextTotals.leads > 0 ? Math.round(totalAdSpend / nextTotals.leads) : null,
        costPerOrder: nextTotals.orders > 0 ? Math.round(totalAdSpend / nextTotals.orders) : null,
      };

      return {
        ...prev,
        channelResults: nextChannels,
        channelTotals: nextTotals,
        kpis: nextKpis,
      };
    });
  };

  // Ad metric update handler
  const handleUpdateAdMetric = (
    platform: "facebook" | "tiktok",
    field: "cost" | "leads" | "consulted" | "converted" | "orders",
    value: number
  ) => {
    setEditData((prev) => {
      if (!prev) return prev;

      const nextComparison = { ...prev.adComparison };
      const currentPlat = nextComparison[platform] || { cost: 0, leads: 0, consulted: 0, converted: 0, orders: 0, cpl: null };
      const targetPlatform = { ...currentPlat, [field]: value };
      targetPlatform.cpl =
        targetPlatform.leads > 0 ? Math.round(targetPlatform.cost / targetPlatform.leads) : null;
      nextComparison[platform] = targetPlatform;

      const fb = nextComparison.facebook;
      const tt = nextComparison.tiktok;
      const totalCost = (fb?.cost || 0) + (tt?.cost || 0);
      const totalLeads = (fb?.leads || 0) + (tt?.leads || 0);
      const totalConsulted = (fb?.consulted || 0) + (tt?.consulted || 0);
      const totalConverted = (fb?.converted || 0) + (tt?.converted || 0);
      const totalOrders = (fb?.orders || 0) + (tt?.orders || 0);
      const totalCpl = totalLeads > 0 ? Math.round(totalCost / totalLeads) : null;

      nextComparison.total = {
        cost: totalCost,
        leads: totalLeads,
        consulted: totalConsulted,
        converted: totalConverted,
        orders: totalOrders,
        cpl: totalCpl,
      };

      const nextFbAds = {
        ...prev.facebookAds,
        totalCost: fb.cost,
        leads: fb.leads,
        consulted: fb.consulted,
        converted: fb.converted,
        orders: fb.orders,
        cpl: fb.cpl,
      };
      const nextTtAds = {
        ...prev.tiktokAds,
        totalCost: tt.cost,
        leads: tt.leads,
        consulted: tt.consulted,
        converted: tt.converted,
        orders: tt.orders,
        cpl: tt.cpl,
      };

      const kpiTotalLeads = prev.kpis?.totalLeads || 0;
      const kpiTotalOrders = prev.kpis?.totalOrders || 0;
      const nextKpis = {
        ...prev.kpis,
        totalAdSpend: totalCost,
        costPerLead: kpiTotalLeads > 0 ? Math.round(totalCost / kpiTotalLeads) : null,
        costPerOrder: kpiTotalOrders > 0 ? Math.round(totalCost / kpiTotalOrders) : null,
      };

      return {
        ...prev,
        adComparison: nextComparison,
        facebookAds: nextFbAds,
        tiktokAds: nextTtAds,
        kpis: nextKpis,
      };
    });
  };

  // Branch results update handler
  const handleUpdateBranch = (
    branchId: string,
    field: keyof BranchResultRow,
    value: number
  ) => {
    setEditData((prev) => {
      if (!prev) return prev;
      const nextBranches = prev.branchResults.map((br) => {
        if (br.branchId === branchId) {
          return { ...br, [field]: value };
        }
        return br;
      });

      const sumBranch = (f: keyof BranchResultRow) =>
        nextBranches.reduce((sum, b) => sum + (Number(b[f]) || 0), 0);

      const nextTotalSystem: BranchResultRow = {
        branchId: "all",
        branchName: "Toàn hệ thống",
        contentCount: sumBranch("contentCount"),
        leads: sumBranch("leads"),
        consulted: sumBranch("consulted"),
        converted: sumBranch("converted"),
        orders: sumBranch("orders"),
        adSpend: sumBranch("adSpend"),
      };

      return {
        ...prev,
        branchResults: nextBranches,
        totalSystemBranch: nextTotalSystem,
      };
    });
  };

  // Content items handlers
  const handleAddContentItem = (item: TopContentItem) => {
    setEditData((prev) => {
      if (!prev) return prev;
      const nextContents = [item, ...(prev.topContents || [])];
      return {
        ...prev,
        topContents: nextContents,
      };
    });
  };

  const handleUpdateContentItem = (id: string, field: keyof TopContentItem, value: any) => {
    setEditData((prev) => {
      if (!prev) return prev;
      const nextContents = (prev.topContents || []).map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      });
      return {
        ...prev,
        topContents: nextContents,
      };
    });
  };

  const handleDeleteContentItem = (id: string) => {
    setEditData((prev) => {
      if (!prev) return prev;
      const nextContents = (prev.topContents || []).filter((item) => item.id !== id);
      return {
        ...prev,
        topContents: nextContents,
      };
    });
  };

  // Format short date
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  // Create new period report handler
  const handleCreateNew = async (params: CreatePeriodicReportParams) => {
    const res = await createOrGetPeriodicReportAction(
      params.reportType,
      params.periodNumber,
      params.year,
      params.branchId,
      {
        startDate: params.startDate,
        endDate: params.endDate,
        periodSpan: params.periodSpan,
        startWeek: params.startWeek,
        endWeek: params.endWeek,
        periodLabel: params.periodLabel,
      }
    );
    if (res.success && res.report) {
      showToast(
        `Đã tạo ${res.report.periodLabel || "báo cáo"} thành công!`
      );
      if (reportType !== params.reportType) {
        setReportType(params.reportType);
      }
      loadReports(params.reportType, params.year, selectedBranchId);
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
        data: (isEditing && editData) ? editData : selectedReport.data,
      };
      const res = await savePeriodicReportDraftAction(updatedPayload);
      if (res.success && res.report) {
        showToast("Đã lưu bản nháp số liệu & đánh giá thành công!");
        setIsEditing(false);
        setReports((prev) => prev.map((r) => (r.id === res.report.id ? res.report : r)));
      } else {
        showToast(res.error || "Lỗi khi lưu bản nháp!");
      }
    });
  };

  // Refresh live source data
  const handleRefreshData = () => {
    if (!selectedReport) return;
    if (selectedReport.status === "closed") {
      showToast("Báo cáo đã chốt không được cập nhật số liệu!");
      return;
    }
    startTransition(async () => {
      const res = await refreshPeriodicReportDataAction(selectedReport.id);
      if (res.success && res.report) {
        showToast("Đã cập nhật số liệu mới nhất từ các module Marketing!");
        setReports((prev) => prev.map((r) => (r.id === res.report.id ? res.report : r)));
      } else {
        showToast(res.error || "Lỗi khi cập nhật số liệu!");
      }
    });
  };

  // Close report (Chốt báo cáo)
  const handleCloseReport = () => {
    if (!selectedReport) return;
    setShowCloseModal(true);
  };

  const confirmCloseReport = () => {
    if (!selectedReport) return;
    startTransition(async () => {
      const res = await closePeriodicReportAction(selectedReport.id);
      if (res.success && res.report) {
        showToast("Báo cáo đã được chốt và lưu snapshot chính thức!");
        setIsEditing(false);
        setReports((prev) => prev.map((r) => (r.id === res.report.id ? res.report : r)));
        setShowCloseModal(false);
      } else {
        showToast(res.error || "Lỗi khi chốt báo cáo!");
      }
    });
  };

  // Reopen report (Mở lại báo cáo - Admin only)
  const handleReopenReport = () => {
    if (!selectedReport) return;
    if (!isAdmin) {
      showToast("Chỉ Ban giám đốc / Admin mới có quyền mở lại báo cáo đã chốt!");
      return;
    }
    setReopenNote("Mở lại để bổ sung đánh giá");
    setShowReopenModal(true);
  };

  const confirmReopenReport = () => {
    if (!selectedReport) return;
    startTransition(async () => {
      const res = await reopenPeriodicReportAction(selectedReport.id, reopenNote);
      if (res.success && res.report) {
        showToast("Đã mở lại báo cáo thành bản nháp!");
        setReports((prev) => prev.map((r) => (r.id === res.report.id ? res.report : r)));
        setShowReopenModal(false);
      } else {
        showToast(res.error || "Lỗi khi mở lại báo cáo!");
      }
    });
  };

  // Print / Export PDF
  const handlePrint = () => {
    if (!selectedReport) return;
    const originalTitle = document.title;
    let periodPart = "";
    if (selectedReport.reportType === "weekly") {
      if (selectedReport.periodSpan && selectedReport.periodSpan > 1) {
        const endWeek = selectedReport.periodNumber + selectedReport.periodSpan - 1;
        periodPart = `Tuần ${selectedReport.periodNumber}-${endWeek} Năm ${selectedReport.year}`;
      } else {
        periodPart = `Tuần ${selectedReport.periodNumber} Năm ${selectedReport.year}`;
      }
    } else if (selectedReport.reportType === "monthly") {
      periodPart = `Tháng ${selectedReport.periodNumber} Năm ${selectedReport.year}`;
    } else {
      periodPart = selectedReport.periodLabel || `Năm ${selectedReport.year}`;
    }

    const branchPart = selectedReport.branchName && selectedReport.branchName !== "Toàn hệ thống"
      ? selectedReport.branchName
      : "Hatico Toàn Hệ Thống";

    document.title = `Báo Cáo Chi Tiết Marketing - ${periodPart} - ${branchPart}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleExportExcel = async () => {
    if (!selectedReport) return;
    try {
      setIsExportingExcel(true);
      await exportPeriodicMarketingReportExcel(selectedReport);
      showToast("Xuất file Excel thành công!");
    } catch (err: any) {
      console.error("Export Excel error:", err);
      showToast(err.message || "Lỗi khi xuất file Excel");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Status Badge (Clean Monochrome)
  const getStatusBadge = (status: "draft" | "closed") => {
    if (status === "closed") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-white tracking-wider uppercase">
          Đã chốt
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 tracking-wider uppercase">
        Bản nháp
      </span>
    );
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden print:h-auto print:overflow-visible bg-white">
      {/* Toast Alert */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded shadow-xl flex items-center gap-2 animate-slide-in no-print">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{notification}</span>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="flex flex-1 min-h-0 flex-col sm:flex-row overflow-hidden print:h-auto print:overflow-visible">
        {/* ================= LEFT HISTORY SIDEBAR ================= */}
        <aside className="w-full sm:w-64 lg:w-72 shrink-0 flex flex-col bg-white border-r border-slate-200/90 overflow-hidden no-print">
          {/* 1. Mode Switcher: Tuần (1-3 tuần) / Tháng / Tùy chọn ngày */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-200/70 rounded-md">
              <button
                type="button"
                onClick={() => {
                  setReportType("weekly");
                  setSpanFilter("all");
                }}
                className={`py-1.5 text-xs font-bold rounded transition-all cursor-pointer text-center ${
                  reportType === "weekly"
                    ? "bg-white text-primary shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Báo cáo tuần (1 tuần, 2 tuần, 3 tuần)"
              >
                Theo tuần
              </button>
              <button
                type="button"
                onClick={() => setReportType("monthly")}
                className={`py-1.5 text-xs font-bold rounded transition-all cursor-pointer text-center ${
                  reportType === "monthly"
                    ? "bg-white text-primary shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Theo tháng
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportType("custom");
                  setSpanFilter("all");
                }}
                className={`py-1.5 text-xs font-bold rounded transition-all cursor-pointer text-center ${
                  reportType === "custom"
                    ? "bg-white text-primary shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Tùy chọn khoảng ngày linh hoạt"
              >
                Tùy chọn
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

          {/* 3. Action bar: Title, Filter chips & + New */}
          <div className="p-2.5 border-b border-slate-100 shrink-0 bg-slate-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800">
                Lịch sử {reportType === "weekly" ? "tuần" : reportType === "monthly" ? "tháng" : "tùy chọn"} ({displayedReports.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="text-xs font-bold text-primary hover:text-primary-hover px-2.5 py-1 rounded-[4px] hover:bg-primary/10 transition-colors cursor-pointer border border-primary/20 flex items-center gap-1"
              >
                <span>+</span>
                <span>{reportType === "weekly" ? "Tạo kỳ mới" : reportType === "monthly" ? "Tháng mới" : "Kỳ mới"}</span>
              </button>
            </div>

            {/* Quick filter for duration (1 tuần, 2 tuần, 3 tuần) when in weekly mode */}
            {reportType === "weekly" && reports.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                {[
                  { id: "all", label: "Tất cả" },
                  { id: "1", label: "1 tuần" },
                  { id: "2", label: "2 tuần" },
                  { id: "3", label: "3 tuần" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setSpanFilter(chip.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer shrink-0 ${
                      spanFilter === chip.id
                        ? "bg-primary text-white"
                        : "bg-slate-200/80 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. Report List */}
          <div className="p-2 gap-1.5 flex flex-col flex-1 overflow-y-auto no-scrollbar">
            {displayedReports.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                {reports.length === 0
                  ? `Chưa có báo cáo nào cho năm ${selectedYear}. Bấm nút "+" ở trên để tạo báo cáo.`
                  : "Không có báo cáo nào khớp với bộ lọc."}
              </div>
            ) : (
              displayedReports.map((rep) => {
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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {rep.periodLabel ||
                            (rep.reportType === "weekly"
                              ? `Tuần ${rep.periodNumber} / ${rep.year}`
                              : `Tháng ${rep.periodNumber} / ${rep.year}`)}
                        </span>
                        {rep.periodSpan && rep.periodSpan > 1 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
                            {rep.periodSpan} tuần
                          </span>
                        )}
                      </div>
                      {rep.status === "closed" && getStatusBadge("closed")}
                    </div>

                    <div className="text-[11px] text-slate-500 mb-1 flex items-center justify-between">
                      <span className="font-mono">
                        {formatShortDate(rep.startDate)} → {formatShortDate(rep.endDate)}
                      </span>
                      <span className="text-[10px] text-slate-400">{rep.branchName}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Người lập: {rep.creatorName}</span>
                      <span className="font-semibold font-mono text-slate-900">
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
        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden print:border-none print:shadow-none print:overflow-visible">
          {/* Empty state when no report selected */}
          {!selectedReport ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Chưa có báo cáo {reportType === "weekly" ? "tuần" : "tháng"} được chọn
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Chọn một báo cáo trong danh sách bên trái hoặc bấm tạo báo cáo mới cho kỳ hiện tại.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded cursor-pointer shadow-xs"
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
                      BÁO CÁO MARKETING{" "}
                      {selectedReport.periodLabel
                        ? selectedReport.periodLabel.toUpperCase()
                        : `${selectedReport.reportType === "weekly" ? "TUẦN" : "THÁNG"} ${selectedReport.periodNumber} / ${selectedReport.year}`}
                    </h1>
                    {getStatusBadge(selectedReport.status)}
                  </div>

                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {formatShortDate(selectedReport.startDate)} – {formatShortDate(selectedReport.endDate)}
                      <span className="ml-1 text-slate-500 font-normal">
                        ({Math.max(1, Math.round((new Date(selectedReport.endDate).getTime() - new Date(selectedReport.startDate).getTime()) / 86400000) + 1)} ngày
                        {selectedReport.periodSpan && selectedReport.periodSpan > 1 ? ` · ${selectedReport.periodSpan} tuần` : ""})
                      </span>
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

                {/* Toolbar Buttons (Monochrome Enterprise) */}
                <div className="flex items-center gap-2 no-print">
                  {/* Refresh live numbers if in draft */}
                  {selectedReport.status === "draft" && !isEditing && (
                    <button
                      type="button"
                      onClick={handleRefreshData}
                      disabled={isPending}
                      className="h-8 px-3 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Lấy lại số liệu mới nhất từ các module Marketing"
                    >
                      <svg className={`w-3.5 h-3.5 text-slate-500 ${isPending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
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
                            onClick={handleCancelEdit}
                            className="h-8 px-3 rounded text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                          >
                            Hủy sửa
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={isPending}
                            className="h-8 px-3.5 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {isPending ? "Đang lưu..." : "Lưu bản nháp"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStartEdit}
                          className="h-8 px-3 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
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
                      className="h-8 px-3.5 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Chốt báo cáo và lưu snapshot số liệu"
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Chốt báo cáo</span>
                    </button>
                  )}

                  {selectedReport.status === "closed" && isAdmin && (
                    <button
                      type="button"
                      onClick={handleReopenReport}
                      disabled={isPending}
                      className="h-8 px-3 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                      title="Mở lại báo cáo để chỉnh sửa"
                    >
                      Mở lại báo cáo
                    </button>
                  )}

                  {/* Print / PDF */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="h-8 px-3.5 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="In báo cáo hoặc lưu định dạng PDF khổ A4"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>In / PDF</span>
                  </button>

                  {/* Export Excel (Multi-tab professional) */}
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={isExportingExcel}
                    className="h-8 px-3.5 rounded text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Xuất file Excel (.xlsx) đầy đủ các tab dữ liệu chi tiết cho từng hạng mục"
                  >
                    <svg className={`w-3.5 h-3.5 text-emerald-700 ${isExportingExcel ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isExportingExcel ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      )}
                    </svg>
                    <span>{isExportingExcel ? "Đang xuất..." : "Xuất Excel"}</span>
                  </button>

                  {/* Delete Report */}
                  {(selectedReport.status === "draft" || isAdmin) && !isEditing && (
                    <button
                      type="button"
                      onClick={handleDeleteReport}
                      disabled={isPending}
                      className="h-8 px-2.5 rounded text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Xóa báo cáo này"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Xóa</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Category Tab Bar (Excel-like Sheet Tabs) */}
              <div className="px-5 py-2 border-b border-slate-200 bg-slate-50/90 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 no-print">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
                  Hạng mục:
                </span>
                {[
                  { id: "all", label: "Tất cả hạng mục" },
                  { id: "kpis", label: "I. Tổng quan KPIs", count: "8 KPIs" },
                  { id: "channels", label: "II. Kênh & Nền tảng", count: "4 Kênh" },
                  { id: "posts", label: "III. Chi tiết Bài viết & Video", count: `${selectedReport.data?.topContents?.length || 0} bài` },
                  { id: "ads", label: "IV. Chiến dịch Ads" },
                  { id: "branches", label: "V. Theo Chi nhánh", count: "5 Chi nhánh" },
                  { id: "evaluation", label: "VI. Đánh giá & Kế hoạch" },
                ].map((tab) => {
                  const isActive = activeCategoryTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCategoryTab(tab.id)}
                      className={`h-7 px-3 rounded text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        isActive
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count && (
                        <span
                          className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                            isActive
                              ? "bg-slate-800 text-slate-300"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Edit Mode Notice Banner */}
              {isEditing && (
                <div className="bg-slate-900 text-white px-5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 no-print shrink-0 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="text-slate-200">
                      <strong>Chế độ chỉnh sửa đang bật:</strong> Bạn có thể sửa trực tiếp số liệu tại bảng Kênh, Quảng cáo, Chi nhánh và Danh sách bài viết. Tổng số và KPIs sẽ tự động cập nhật theo thời gian thực.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedReport?.data) {
                          setEditData(JSON.parse(JSON.stringify(selectedReport.data)));
                          showToast("Đã khôi phục số liệu gốc!");
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors cursor-pointer"
                    >
                      Khôi phục số liệu gốc
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isPending}
                      className="px-3 py-1 text-[11px] font-bold bg-white text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isPending ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </div>
              )}

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
                <section className={activeCategoryTab !== "all" && activeCategoryTab !== "kpis" ? "hidden print:block" : "space-y-2.5 break-inside-avoid"}>
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-slate-900 rounded-xs" />
                      <span>Phần I. Tổng quan kết quả Marketing</span>
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium no-print">
                      8 Chỉ số KPIs cốt lõi
                    </span>
                  </div>

                  <PeriodicKpiCards
                    kpis={(isEditing && editData) ? editData.kpis : selectedReport.data?.kpis}
                    comparison={(isEditing && editData) ? editData.kpiComparison : selectedReport.data?.kpiComparison}
                    reportType={selectedReport.reportType}
                    comparisonLabel={
                      selectedReport.periodSpan && selectedReport.periodSpan > 1
                        ? `so với ${selectedReport.periodSpan} tuần trước`
                        : selectedReport.reportType === "weekly"
                          ? "so với tuần trước"
                          : selectedReport.reportType === "monthly"
                            ? "so với tháng trước"
                            : "so với kỳ trước"
                    }
                  />
                </section>

                {/* ================= PHẦN II – KẾT QUẢ THEO KÊNH ================= */}
                <section className={activeCategoryTab !== "all" && activeCategoryTab !== "channels" && activeCategoryTab !== "posts" ? "hidden print:block" : "space-y-2.5 break-inside-avoid"}>
                  <div className="pb-1 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-slate-900 rounded-xs" />
                      <span>Phần II. Kết quả theo kênh & nội dung</span>
                    </h3>
                  </div>

                  <PeriodicChannelTable
                    channels={
                      (isEditing && editData)
                        ? editData.channelResults
                        : selectedReport.data?.channelResults || []
                    }
                    totals={
                      (isEditing && editData)
                        ? editData.channelTotals
                        : selectedReport.data?.channelTotals || {
                            contentCount: 0,
                            views: 0,
                            interactions: 0,
                            leads: 0,
                            consulted: 0,
                            converted: 0,
                            orders: 0,
                          }
                    }
                    topContents={
                      (isEditing && editData)
                        ? editData.topContents
                        : selectedReport.data?.topContents || []
                    }
                    isEditing={isEditing}
                    showOnlyTable={activeCategoryTab === "channels"}
                    showOnlyPosts={activeCategoryTab === "posts"}
                    onUpdateChannel={handleUpdateChannel}
                    onAddContentItem={handleAddContentItem}
                    onUpdateContentItem={handleUpdateContentItem}
                    onDeleteContentItem={handleDeleteContentItem}
                  />
                </section>

                {/* ================= PHẦN III – BÁO CÁO CHIẾN DỊCH QUẢNG CÁO ================= */}
                <section className={activeCategoryTab !== "all" && activeCategoryTab !== "ads" ? "hidden print:block" : "space-y-2.5 break-inside-avoid"}>
                  <div className="pb-1 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-slate-900 rounded-xs" />
                      <span>Phần III. Báo cáo chiến dịch quảng cáo (Ads)</span>
                    </h3>
                  </div>

                  <PeriodicCampaignsSection
                    facebookAds={
                      (isEditing && editData)
                        ? editData.facebookAds
                        : selectedReport.data?.facebookAds || {
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
                      (isEditing && editData)
                        ? editData.tiktokAds
                        : selectedReport.data?.tiktokAds || {
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
                      (isEditing && editData)
                        ? editData.adComparison
                        : selectedReport.data?.adComparison || {
                            facebook: { cost: 0, leads: 0, consulted: 0, converted: 0, orders: 0, cpl: null },
                            tiktok: { cost: 0, leads: 0, consulted: 0, converted: 0, orders: 0, cpl: null },
                            total: { cost: 0, leads: 0, consulted: 0, converted: 0, orders: 0, cpl: null },
                          }
                    }
                    isEditing={isEditing}
                    onUpdateAdMetric={handleUpdateAdMetric}
                  />
                </section>

                {/* ================= PHẦN IV – KẾT QUẢ THEO CHI NHÁNH ================= */}
                <section className={activeCategoryTab !== "all" && activeCategoryTab !== "branches" ? "hidden print:block" : "space-y-2.5 break-inside-avoid"}>
                  <div className="pb-1 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-slate-900 rounded-xs" />
                      <span>Phần IV. Kết quả theo chi nhánh</span>
                    </h3>
                  </div>

                  <PeriodicBranchTable
                    branchResults={
                      (isEditing && editData)
                        ? editData.branchResults
                        : selectedReport.data?.branchResults || []
                    }
                    totalSystem={
                      (isEditing && editData)
                        ? editData.totalSystemBranch
                        : selectedReport.data?.totalSystemBranch || {
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
                    isEditing={isEditing}
                    onUpdateBranch={handleUpdateBranch}
                  />
                </section>

                {/* ================= PHẦN V – ĐÁNH GIÁ HOẠT ĐỘNG MARKETING ================= */}
                <section className={activeCategoryTab !== "all" && activeCategoryTab !== "evaluation" ? "hidden print:block" : "space-y-2.5 break-inside-avoid"}>
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-slate-900 rounded-xs" />
                      <span>Phần V. Đánh giá hoạt động Marketing</span>
                    </h3>
                    {isEditing && (
                      <span className="text-[11px] text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        Đang ở chế độ chỉnh sửa
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
                <section className={activeCategoryTab !== "all" && activeCategoryTab !== "evaluation" ? "hidden print:block" : "space-y-2.5 break-inside-avoid"}>
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-slate-900 rounded-xs" />
                      <span>Phần VI. Kế hoạch công việc kỳ tiếp theo</span>
                    </h3>
                    {isEditing && (
                      <span className="text-[11px] text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        Đang ở chế độ chỉnh sửa
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

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in no-print">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Xác nhận xóa báo cáo</h3>
                  <p className="text-[11px] text-slate-500">Thao tác này sẽ xóa vĩnh viễn dữ liệu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="w-7 h-7 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn báo cáo Marketing này không?
              </p>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Kỳ báo cáo:</span>
                  <span className="font-bold text-slate-900">
                    {selectedReport.periodLabel || (
                      selectedReport.reportType === "weekly"
                        ? `Tuần ${selectedReport.periodNumber} / ${selectedReport.year}`
                        : `Tháng ${selectedReport.periodNumber} / ${selectedReport.year}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Thời gian:</span>
                  <span className="text-slate-700">
                    {formatShortDate(selectedReport.startDate)} → {formatShortDate(selectedReport.endDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Phạm vi:</span>
                  <span className="text-slate-700">{selectedReport.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Người tạo:</span>
                  <span className="text-slate-700">{selectedReport.creatorName}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
                <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  <strong>Lưu ý:</strong> Toàn bộ dữ liệu tổng hợp, số liệu kênh và danh sách bài viết trong báo cáo này sẽ bị xóa khỏi hệ thống và <strong>không thể hoàn tác</strong>.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isPending}
                className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteReport}
                disabled={isPending}
                className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Close Confirmation Modal */}
      {showCloseModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in no-print">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Xác nhận chốt báo cáo</h3>
                  <p className="text-[11px] text-slate-500">Lưu snapshot số liệu chính thức</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="w-7 h-7 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Bạn có chắc chắn muốn <strong>CHỐT</strong> báo cáo{" "}
                <strong>
                  {selectedReport.periodLabel || (
                    selectedReport.reportType === "weekly"
                      ? `Tuần ${selectedReport.periodNumber} / ${selectedReport.year}`
                      : `Tháng ${selectedReport.periodNumber} / ${selectedReport.year}`
                  )}
                </strong>
                ?
              </p>

              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Sau khi chốt, toàn bộ số liệu và đánh giá sẽ được đóng băng snapshot chính thức. Chỉ tài khoản <strong>Admin</strong> mới có quyền mở lại để chỉnh sửa.
                </span>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                disabled={isPending}
                className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmCloseReport}
                disabled={isPending}
                className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? "Đang chốt..." : "Chốt báo cáo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reopen Modal */}
      {showReopenModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in no-print">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Mở lại báo cáo đã chốt</h3>
                  <p className="text-[11px] text-slate-500">Chuyển trạng thái về bản nháp để chỉnh sửa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="w-7 h-7 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Lý do mở lại báo cáo:
                </label>
                <textarea
                  value={reopenNote}
                  onChange={(e) => setReopenNote(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                  placeholder="Nhập lý do mở lại báo cáo..."
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                disabled={isPending}
                className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmReopenReport}
                disabled={isPending}
                className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? "Đang xử lý..." : "Xác nhận mở lại"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Document Portal */}
      {printMounted && selectedReport && createPortal(
        <PeriodicMarketingPrintDocument
          report={{
            ...selectedReport,
            evaluation: isEditing ? editEvaluation : selectedReport.evaluation,
            actionPlan: isEditing ? editActionPlan : selectedReport.actionPlan,
            data: (isEditing && editData) ? editData : selectedReport.data,
          }}
        />,
        document.body
      )}
    </div>
  );
}

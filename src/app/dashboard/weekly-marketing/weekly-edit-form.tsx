"use client";

import React, { useState } from "react";
import {
  WeeklyMarketingReport,
  ContentItem,
  ContentPlatform,
  ContentStatus,
} from "@/lib/weekly-marketing-types";
import {
  calculateTiktokMetrics,
  calculateFacebookMetrics,
  calculateWebsiteMetrics,
  calculateExecutiveKPIs,
  hasValue,
  formatNumber,
  formatCurrencyVND,
  formatPercent,
} from "@/lib/weekly-marketing-calculator";
import { CustomSelect } from "@/components/custom-select";

interface WeeklyEditFormProps {
  initialReport: WeeklyMarketingReport;
  onSaveDraft: (updated: WeeklyMarketingReport) => void;
  onSubmitReport: (updated: WeeklyMarketingReport) => void;
  onCancel: () => void;
}

type EditTab = "tiktok" | "facebook" | "website" | "leads" | "content" | "analysis";

export function WeeklyEditForm({
  initialReport,
  onSaveDraft,
  onSubmitReport,
  onCancel,
}: WeeklyEditFormProps) {
  const [report, setReport] = useState<WeeklyMarketingReport>(() =>
    JSON.parse(JSON.stringify(initialReport))
  );
  const [activeTab, setActiveTab] = useState<EditTab>("tiktok");
  const [lastSavedTime, setLastSavedTime] = useState<string>("Vừa cập nhật");

  // Dynamic calculations for real-time preview
  const tkCalc = calculateTiktokMetrics(report.tiktokMetrics);
  const fbCalc = calculateFacebookMetrics(report.facebookMetrics);
  const webCalc = calculateWebsiteMetrics(report.websiteMetrics);
  const kpis = calculateExecutiveKPIs(report);

  // Parse string input to number or null (preserving difference between empty vs 0)
  const parseNullableNumber = (val: string): number | null => {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    const clean = trimmed.replace(/[^0-9]/g, "");
    if (clean === "") return null;
    return Math.max(0, parseInt(clean, 10));
  };

  const displayInputValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    return formatNumber(val);
  };

  const displayRawNumber = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    return String(val);
  };

  const updateTk = (key: keyof typeof report.tiktokMetrics, val: unknown) => {
    setReport((prev) => ({
      ...prev,
      tiktokMetrics: { ...prev.tiktokMetrics, [key]: val },
    }));
  };

  const updateFb = (key: keyof typeof report.facebookMetrics, val: unknown) => {
    setReport((prev) => ({
      ...prev,
      facebookMetrics: { ...prev.facebookMetrics, [key]: val },
    }));
  };

  const updateWeb = (key: keyof typeof report.websiteMetrics, val: unknown) => {
    setReport((prev) => ({
      ...prev,
      websiteMetrics: { ...prev.websiteMetrics, [key]: val },
    }));
  };

  const updateLeads = (key: keyof typeof report.leadMetrics, val: unknown) => {
    setReport((prev) => ({
      ...prev,
      leadMetrics: { ...prev.leadMetrics, [key]: val },
    }));
  };

  const handleAddContentItem = () => {
    const newItem: ContentItem = {
      id: `cnt-${Date.now()}`,
      platform: "TikTok",
      title: "",
      publishDate: report.startDate,
      contentType: "Video ngắn",
      viewsOrReach: null,
      likes: null,
      comments: null,
      shares: null,
      leads: null,
      status: "Tốt",
    };
    setReport((prev) => ({
      ...prev,
      contentPerformance: [newItem, ...prev.contentPerformance],
    }));
  };

  const handleRemoveContentItem = (id: string) => {
    setReport((prev) => ({
      ...prev,
      contentPerformance: prev.contentPerformance.filter((item) => item.id !== id),
    }));
  };

  const handleUpdateContentItem = (id: string, field: keyof ContentItem, val: unknown) => {
    setReport((prev) => ({
      ...prev,
      contentPerformance: prev.contentPerformance.map((item) =>
        item.id === id ? { ...item, [field]: val } : item
      ),
    }));
  };

  const handleSaveDraftClick = () => {
    const now = new Date();
    setLastSavedTime(`Đã lưu lúc ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`);
    onSaveDraft(report);
  };

  // Reusable Auto-Calculated read-only field (shows 'Chưa đủ dữ liệu' if incomplete source data)
  const renderCalculatedField = (label: string, value: string | number | null | undefined, highlight = false) => {
    const formatted = hasValue(value) ? String(value) : "Chưa đủ dữ liệu";
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 flex flex-col justify-between select-none">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>{label}</span>
          <span className="text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.2 rounded font-semibold">Tự động tính</span>
        </div>
        <div className={`mt-1 ${hasValue(value) ? (highlight ? "text-sm font-black text-emerald-700" : "text-sm font-black text-slate-900") : "text-xs italic text-slate-400 font-normal"}`}>
          {formatted}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden relative">
      {/* Top Segmented Tab Navigation: Linear/Stripe style */}
      <div className="px-5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0">
        <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {[
            { id: "tiktok" as const, label: "TikTok" },
            { id: "facebook" as const, label: "Facebook" },
            { id: "website" as const, label: "Website" },
            { id: "leads" as const, label: "Khách hàng & ROI" },
            { id: "content" as const, label: `Nội dung (${report.contentPerformance.length})` },
            { id: "analysis" as const, label: "Đánh giá tuần" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 font-medium hidden sm:block">
          Tuần {report.weekNumber} · {report.startDate} – {report.endDate}
        </div>
      </div>

      {/* Real-time Summary preview ribbon (Only shows populated preview values) */}
      <div className="bg-slate-50/70 border-b border-slate-100 px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-4 text-slate-600 shrink-0">
        <div className="flex items-center gap-4">
          <span>Tiếp cận: <strong className="text-slate-900">{hasValue(kpis.totalReach) ? formatNumber(kpis.totalReach) : "—"}</strong></span>
          <span>Lượt xem: <strong className="text-slate-900">{hasValue(kpis.totalViews) ? formatNumber(kpis.totalViews) : "—"}</strong></span>
          <span>Leads: <strong className="text-emerald-700 font-bold">{hasValue(kpis.totalLeads) ? formatNumber(kpis.totalLeads) : "—"}</strong></span>
          <span>Khách chốt: <strong className="text-emerald-700 font-bold">{hasValue(kpis.totalConversions) ? `${kpis.totalConversions} xe` : "—"}</strong></span>
        </div>
        <div className="flex items-center gap-4">
          <span>Chi phí Ads: <strong className="text-primary font-bold">{hasValue(kpis.totalAdSpend) ? formatCurrencyVND(kpis.totalAdSpend) : "—"}</strong></span>
          <span>CPL: <strong className="text-primary font-bold">{hasValue(kpis.costPerLead) ? formatCurrencyVND(kpis.costPerLead) : "—"}</strong></span>
        </div>
      </div>

      {/* Main Tab Form Panels Content (All fields optional, clearly marked) */}
      <div className="p-5 overflow-y-auto flex-1 space-y-7 pb-24">
        {/* ================= 1. TIKTOK ================= */}
        {activeTab === "tiktok" && (
          <div className="space-y-6 max-w-4xl">
            {/* 1. BUSINESS RESULTS (PRIORITIZED) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>1. Kết quả kinh doanh từ TikTok</span>
                </h4>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn nhập</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Leads từ Video tự nhiên</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.tiktokMetrics.leads)}
                    onChange={(e) => updateTk("leads", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Leads từ TikTok Ads</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.tiktokMetrics.adLeads)}
                    onChange={(e) => updateTk("adLeads", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Khách chốt từ TikTok Ads</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.tiktokMetrics.adConversions)}
                    onChange={(e) => updateTk("adConversions", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* 2. AUDIENCE */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  <span>2. Khán giả & Kênh (Audience)</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Followers đầu tuần</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.followersStart)}
                    onChange={(e) => updateTk("followersStart", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Followers cuối tuần</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.followersEnd)}
                    onChange={(e) => {
                      const endVal = parseNullableNumber(e.target.value);
                      updateTk("followersEnd", endVal);
                      if (endVal !== null && hasValue(report.tiktokMetrics.followersStart)) {
                        updateTk("newFollowers", endVal - (report.tiktokMetrics.followersStart as number));
                      }
                    }}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {renderCalculatedField("Follower mới", hasValue(report.tiktokMetrics.newFollowers) ? `+${formatNumber(report.tiktokMetrics.newFollowers)}` : null, true)}
                {renderCalculatedField("Tăng trưởng follower", hasValue(tkCalc.followerGrowthRate) ? formatPercent(tkCalc.followerGrowthRate) : null, true)}
              </div>
            </div>

            {/* 3. CONTENT */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  <span>3. Nội dung & Tương tác (Content & Views)</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Số video đăng</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.tiktokMetrics.videosPublished)}
                    onChange={(e) => updateTk("videosPublished", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Tổng lượt xem</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.totalViews)}
                    onChange={(e) => updateTk("totalViews", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Lượt tiếp cận (Reach)</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.uniqueReach)}
                    onChange={(e) => updateTk("uniqueReach", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Xem trang cá nhân</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.profileViews)}
                    onChange={(e) => updateTk("profileViews", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Interactions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Thả tim (Likes)</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.likes)}
                    onChange={(e) => updateTk("likes", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Bình luận</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.comments)}
                    onChange={(e) => updateTk("comments", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Chia sẻ</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.shares)}
                    onChange={(e) => updateTk("shares", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Lưu video</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.saves)}
                    onChange={(e) => updateTk("saves", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* 4. PAID ADS */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  <span>4. Quảng cáo TikTok Ads (Paid Ads)</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Chi phí Ads (VNĐ)</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.adSpend)}
                    onChange={(e) => updateTk("adSpend", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-bold text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Lượt hiển thị Ads</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.adImpressions)}
                    onChange={(e) => updateTk("adImpressions", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Lượt Clicks</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.adClicks)}
                    onChange={(e) => updateTk("adClicks", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Lượt tiếp cận Ads</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.tiktokMetrics.adReach)}
                    onChange={(e) => updateTk("adReach", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Auto calculated CTR & CPL */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {renderCalculatedField("CTR (Tỷ lệ click)", hasValue(tkCalc.ctr) ? formatPercent(tkCalc.ctr) : null)}
                {renderCalculatedField("CPC (Chi phí / Click)", hasValue(tkCalc.cpc) ? formatCurrencyVND(tkCalc.cpc) : null)}
                {renderCalculatedField("CPL (Chi phí / Lead)", hasValue(tkCalc.cpl) ? formatCurrencyVND(tkCalc.cpl) : null)}
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. FACEBOOK ================= */}
        {activeTab === "facebook" && (
          <div className="space-y-6 max-w-4xl">
            {/* 1. BUSINESS RESULTS (PRIORITIZED) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>1. Chuyển đổi từ Fanpage (Business Results)</span>
                </h4>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Leads từ Fanpage</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.facebookMetrics.leads)}
                    onChange={(e) => updateFb("leads", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Khách chốt đơn</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.facebookMetrics.conversions)}
                    onChange={(e) => updateFb("conversions", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Tin nhắn mới (Inbox)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.facebookMetrics.messagesStarted)}
                    onChange={(e) => updateFb("messagesStarted", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 2. AUDIENCE */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1877F2]" />
                  <span>2. Khán giả Fanpage (Audience)</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Followers đầu tuần</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.facebookMetrics.followersStart)}
                    onChange={(e) => updateFb("followersStart", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Followers cuối tuần</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.facebookMetrics.followersEnd)}
                    onChange={(e) => {
                      const endVal = parseNullableNumber(e.target.value);
                      updateFb("followersEnd", endVal);
                      if (endVal !== null && hasValue(report.facebookMetrics.followersStart)) {
                        updateFb("newFollowers", endVal - (report.facebookMetrics.followersStart as number));
                      }
                    }}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {renderCalculatedField("Follower mới", hasValue(report.facebookMetrics.newFollowers) ? `+${formatNumber(report.facebookMetrics.newFollowers)}` : null, true)}
                {renderCalculatedField("Tăng trưởng follower", hasValue(fbCalc.followerGrowthRate) ? formatPercent(fbCalc.followerGrowthRate) : null, true)}
              </div>
            </div>

            {/* 3. CONTENT */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1877F2]" />
                  <span>3. Bài viết & Tương tác (Content & Reach)</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Số bài đăng</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.facebookMetrics.postsPublished)}
                    onChange={(e) => updateFb("postsPublished", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Tiếp cận (Reach)</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.facebookMetrics.reach)}
                    onChange={(e) => updateFb("reach", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Lượt hiển thị</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.facebookMetrics.impressions)}
                    onChange={(e) => updateFb("impressions", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Click liên kết</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.facebookMetrics.linkClicks)}
                    onChange={(e) => updateFb("linkClicks", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Interactions */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Lượt Thích</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.facebookMetrics.likes)}
                    onChange={(e) => updateFb("likes", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Bình luận</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.facebookMetrics.comments)}
                    onChange={(e) => updateFb("comments", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Chia sẻ</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.facebookMetrics.shares)}
                    onChange={(e) => updateFb("shares", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* 4. PAID ADS */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1877F2]" />
                  <span>4. Quảng cáo Facebook Ads (Paid Ads)</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Chi phí Ads (VNĐ)</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.facebookMetrics.adSpend)}
                    onChange={(e) => updateFb("adSpend", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-bold text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Lượt hiển thị Ads</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.facebookMetrics.adImpressions)}
                    onChange={(e) => updateFb("adImpressions", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Click liên kết Ads</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.facebookMetrics.adLinkClicks)}
                    onChange={(e) => updateFb("adLinkClicks", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Leads từ Ads</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.facebookMetrics.adLeads)}
                    onChange={(e) => updateFb("adLeads", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Auto calculated CTR, CPL, Fanpage conversion */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {renderCalculatedField("CTR (Tỷ lệ click)", hasValue(fbCalc.ctr) ? formatPercent(fbCalc.ctr) : null)}
                {renderCalculatedField("CPL (Chi phí / Lead)", hasValue(fbCalc.cpl) ? formatCurrencyVND(fbCalc.cpl) : null)}
                {renderCalculatedField("Tỷ lệ chốt từ Fanpage", hasValue(fbCalc.conversionRate) ? formatPercent(fbCalc.conversionRate) : null, true)}
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. WEBSITE ================= */}
        {activeTab === "website" && (
          <div className="space-y-6 max-w-4xl">
            {/* 1. BUSINESS RESULTS (PRIORITIZED) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>1. Kết quả chuyển đổi từ Website (Business Results)</span>
                </h4>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Tổng Leads từ Web</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.websiteMetrics.leads)}
                    onChange={(e) => updateWeb("leads", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Khách chốt từ Web</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.websiteMetrics.conversions)}
                    onChange={(e) => updateWeb("conversions", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                {renderCalculatedField("Tỷ lệ chốt từ Lead (Customers / Leads)", hasValue(webCalc.customerConversionRate) ? formatPercent(webCalc.customerConversionRate) : null, true)}
              </div>
            </div>

            {/* 2. TRAFFIC */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>2. Lưu lượng truy cập Website Hatico.vn</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Phiên (Sessions)</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.websiteMetrics.sessions)}
                    onChange={(e) => updateWeb("sessions", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Người dùng (Users)</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.websiteMetrics.totalUsers)}
                    onChange={(e) => updateWeb("totalUsers", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Người dùng mới</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.websiteMetrics.newUsers)}
                    onChange={(e) => updateWeb("newUsers", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Xem trang (Pageviews)</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.websiteMetrics.pageViews)}
                    onChange={(e) => updateWeb("pageViews", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* 3. CONVERSION ACTIONS */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>3. Hành động tương tác trực tuyến</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Form liên hệ</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.websiteMetrics.contactFormSubmissions)}
                    onChange={(e) => updateWeb("contactFormSubmissions", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Bấm gọi Hotline</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.websiteMetrics.phoneCallClicks)}
                    onChange={(e) => updateWeb("phoneCallClicks", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Bấm chat Zalo</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.websiteMetrics.zaloClicks)}
                    onChange={(e) => updateWeb("zaloClicks", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Yêu cầu báo giá</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.websiteMetrics.quoteRequests)}
                    onChange={(e) => updateWeb("quoteRequests", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. LEADS & ROI ================= */}
        {activeTab === "leads" && (
          <div className="space-y-6 max-w-4xl">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Tổng hợp kết quả kinh doanh & Doanh thu tuần</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Tổng Leads</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.leadMetrics.totalLeads)}
                    onChange={(e) => updateLeads("totalLeads", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Khách đủ ĐK</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.leadMetrics.qualifiedLeads)}
                    onChange={(e) => updateLeads("qualifiedLeads", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Khách chốt đơn</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa nhập"
                    value={displayRawNumber(report.leadMetrics.convertedCustomers)}
                    onChange={(e) => updateLeads("convertedCustomers", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 font-bold text-slate-900 bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Doanh thu ước tính (VNĐ)</label>
                  <input
                    type="text"
                    placeholder="Chưa nhập"
                    value={displayInputValue(report.leadMetrics.revenueGenerated)}
                    onChange={(e) => updateLeads("revenueGenerated", parseNullableNumber(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-bold text-emerald-700"
                  />
                </div>
              </div>
            </div>

            {/* Source Attribution Breakdown Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800">
                Chi tiết phân bổ theo từng nguồn tiếp thị (Tùy chọn)
              </h4>
              <div className="border border-slate-200/70 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200/70">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Nguồn</th>
                      <th className="py-2.5 px-3 font-bold w-24">Leads</th>
                      <th className="py-2.5 px-3 font-bold w-24">Khách đủ ĐK</th>
                      <th className="py-2.5 px-3 font-bold w-24">Khách chốt</th>
                      <th className="py-2.5 px-3 font-bold w-36">Chi phí Ads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(report.leadMetrics.channelBreakdown || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-medium text-slate-800">{item.source}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            placeholder="—"
                            value={displayRawNumber(item.leads)}
                            onChange={(e) => {
                              const val = parseNullableNumber(e.target.value);
                              const next = [...(report.leadMetrics.channelBreakdown || [])];
                              next[idx] = { ...next[idx], leads: val };
                              updateLeads("channelBreakdown", next);
                            }}
                            className="w-20 text-xs px-2 py-1 rounded-md border border-slate-200 text-right font-bold"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            placeholder="—"
                            value={displayRawNumber(item.qualifiedLeads)}
                            onChange={(e) => {
                              const val = parseNullableNumber(e.target.value);
                              const next = [...(report.leadMetrics.channelBreakdown || [])];
                              next[idx] = { ...next[idx], qualifiedLeads: val };
                              updateLeads("channelBreakdown", next);
                            }}
                            className="w-20 text-xs px-2 py-1 rounded-md border border-slate-200 text-right"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            placeholder="—"
                            value={displayRawNumber(item.conversions)}
                            onChange={(e) => {
                              const val = parseNullableNumber(e.target.value);
                              const next = [...(report.leadMetrics.channelBreakdown || [])];
                              next[idx] = { ...next[idx], conversions: val };
                              updateLeads("channelBreakdown", next);
                            }}
                            className="w-20 text-xs px-2 py-1 rounded-md border border-slate-200 font-bold text-slate-900 text-right focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="—"
                            value={displayInputValue(item.adSpend)}
                            onChange={(e) => {
                              const val = parseNullableNumber(e.target.value);
                              const next = [...(report.leadMetrics.channelBreakdown || [])];
                              next[idx] = { ...next[idx], adSpend: val };
                              updateLeads("channelBreakdown", next);
                            }}
                            className="w-32 text-xs px-2 py-1 rounded-md border border-slate-200 text-right font-medium"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. CONTENT PERFORMANCE ================= */}
        {activeTab === "content" && (
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Danh sách nội dung xuất bản trong tuần
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tùy chọn thêm các bài viết và video xuất bản
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddContentItem}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer shadow-2xs"
              >
                + Thêm nội dung mới
              </button>
            </div>

            <div className="space-y-3">
              {report.contentPerformance.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-md border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2.5 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CustomSelect
                        portal
                        size="xs"
                        value={item.platform}
                        onChange={(val) =>
                          handleUpdateContentItem(item.id, "platform", val as ContentPlatform)
                        }
                        options={[
                          { value: "TikTok", label: "TikTok" },
                          { value: "Facebook", label: "Facebook" },
                          { value: "Website", label: "Website" },
                          { value: "YouTube", label: "YouTube" },
                        ]}
                        className="w-28"
                      />

                      <CustomSelect
                        portal
                        size="xs"
                        value={item.rank || 0}
                        onChange={(val) => {
                          const r = Number(val);
                          handleUpdateContentItem(item.id, "rank", r > 0 ? r : null);
                        }}
                        options={[
                          { value: 0, label: "Không xếp hạng" },
                          { value: 1, label: "🥇 Top 1" },
                          { value: 2, label: "🥈 Top 2" },
                          { value: 3, label: "🥉 Top 3" },
                        ]}
                        className="w-32"
                      />

                      <CustomSelect
                        portal
                        size="xs"
                        value={item.status}
                        onChange={(val) =>
                          handleUpdateContentItem(item.id, "status", val as ContentStatus)
                        }
                        options={[
                          { value: "Xuất sắc", label: "Xuất sắc" },
                          { value: "Tốt", label: "Tốt" },
                          { value: "Trung bình", label: "Trung bình" },
                          { value: "Cần cải thiện", label: "Cần cải thiện" },
                        ]}
                        className="w-28"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveContentItem(item.id)}
                      className="text-xs text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] text-slate-500 block mb-1">Tiêu đề bài viết / video</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateContentItem(item.id, "title", e.target.value)}
                        placeholder="Nhập tiêu đề ấn phẩm..."
                        className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Ngày đăng</label>
                      <input
                        type="date"
                        value={item.publishDate || ""}
                        onChange={(e) => handleUpdateContentItem(item.id, "publishDate", e.target.value || null)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Lượt xem / Reach</label>
                      <input
                        type="text"
                        placeholder="Chưa nhập"
                        value={displayInputValue(item.viewsOrReach)}
                        onChange={(e) =>
                          handleUpdateContentItem(item.id, "viewsOrReach", parseNullableNumber(e.target.value))
                        }
                        className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-right font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Thích</label>
                      <input
                        type="text"
                        placeholder="Chưa nhập"
                        value={displayInputValue(item.likes)}
                        onChange={(e) =>
                          handleUpdateContentItem(item.id, "likes", parseNullableNumber(e.target.value))
                        }
                        className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-right"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Bình luận</label>
                      <input
                        type="text"
                        placeholder="Chưa nhập"
                        value={displayInputValue(item.comments)}
                        onChange={(e) =>
                          handleUpdateContentItem(item.id, "comments", parseNullableNumber(e.target.value))
                        }
                        className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-right"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Chia sẻ</label>
                      <input
                        type="text"
                        placeholder="Chưa nhập"
                        value={displayInputValue(item.shares)}
                        onChange={(e) =>
                          handleUpdateContentItem(item.id, "shares", parseNullableNumber(e.target.value))
                        }
                        className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-right"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-emerald-700 font-bold block mb-1">Leads</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Chưa nhập"
                        value={displayRawNumber(item.leads)}
                        onChange={(e) =>
                          handleUpdateContentItem(item.id, "leads", parseNullableNumber(e.target.value))
                        }
                        className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 font-semibold text-slate-900 text-right focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 6. WEEKLY REVIEW ================= */}
        {activeTab === "analysis" && (
          <div className="space-y-5 max-w-4xl">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 block">
                1. Kết quả nổi bật trong tuần (mỗi ý một dòng, tùy chọn)
              </label>
              <textarea
                rows={3}
                value={report.weeklyAnalysis.highlights?.join("\n") || ""}
                onChange={(e) =>
                  setReport((prev) => ({
                    ...prev,
                    weeklyAnalysis: {
                      ...prev.weeklyAnalysis,
                      highlights: e.target.value.split("\n").filter((s) => s.trim().length > 0),
                    },
                  }))
                }
                className="w-full text-xs p-3 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 leading-relaxed"
                placeholder="Ghi nhận các mốc tăng trưởng, chiến dịch thành công..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 block">
                2. Nội dung hiệu quả nhất & Nguyên nhân thành công (tùy chọn)
              </label>
              <textarea
                rows={3}
                value={report.weeklyAnalysis.bestContentRationale || ""}
                onChange={(e) =>
                  setReport((prev) => ({
                    ...prev,
                    weeklyAnalysis: {
                      ...prev.weeklyAnalysis,
                      bestContentRationale: e.target.value.trim() ? e.target.value : null,
                    },
                  }))
                }
                className="w-full text-xs p-3 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 leading-relaxed"
                placeholder="Phân tích vì sao nội dung đó hút view, viral hoặc tạo ra nhiều leads..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 block">
                3. Vấn đề & Điểm cần cải thiện (tùy chọn)
              </label>
              <textarea
                rows={3}
                value={report.weeklyAnalysis.issuesAndImprovements?.join("\n") || ""}
                onChange={(e) =>
                  setReport((prev) => ({
                    ...prev,
                    weeklyAnalysis: {
                      ...prev.weeklyAnalysis,
                      issuesAndImprovements: e.target.value.split("\n").filter((s) => s.trim().length > 0),
                    },
                  }))
                }
                className="w-full text-xs p-3 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 leading-relaxed"
                placeholder="Các trục trặc về chi phí ads, chất lượng leads, video flop..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 block">
                4. Kế hoạch trọng tâm tuần tới (tùy chọn)
              </label>
              <textarea
                rows={3}
                value={report.weeklyAnalysis.nextWeekPlan?.join("\n") || ""}
                onChange={(e) =>
                  setReport((prev) => ({
                    ...prev,
                    weeklyAnalysis: {
                      ...prev.weeklyAnalysis,
                      nextWeekPlan: e.target.value.split("\n").filter((s) => s.trim().length > 0),
                    },
                  }))
                }
                className="w-full text-xs p-3 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 leading-relaxed"
                placeholder="Kế hoạch trọng tâm..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 block">
                5. Đề xuất & Kiến nghị với Ban Giám Đốc (tùy chọn)
              </label>
              <textarea
                rows={2}
                value={report.weeklyAnalysis.recommendations?.join("\n") || ""}
                onChange={(e) =>
                  setReport((prev) => ({
                    ...prev,
                    weeklyAnalysis: {
                      ...prev.weeklyAnalysis,
                      recommendations: e.target.value.split("\n").filter((s) => s.trim().length > 0),
                    },
                  }))
                }
                className="w-full text-xs p-3 rounded-md border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 leading-relaxed"
                placeholder="Đề xuất ngân sách, nhân sự, quy trình..."
              />
            </div>
          </div>
        )}
      </div>

      {/* ================= STICKY BOTTOM FORM ACTIONS ================= */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="text-xs text-slate-400 font-medium">
          {lastSavedTime}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSaveDraftClick}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-primary/30 text-primary bg-white hover:bg-primary/5 transition-colors cursor-pointer"
          >
            Lưu bản nháp
          </button>
          <button
            type="button"
            onClick={() => onSubmitReport(report)}
            className="text-xs font-bold px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors cursor-pointer shadow-xs"
          >
            Nộp báo cáo
          </button>
        </div>
      </div>
    </div>
  );
}

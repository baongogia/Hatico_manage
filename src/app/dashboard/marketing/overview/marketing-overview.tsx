"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  ExecutiveKPISummary,
  TrendDataPoint,
  ChannelComparisonPoint,
  AdPerformancePoint,
  BranchPerformanceRow,
  MarketingFilter,
  HATICO_BRANCHES,
} from "@/lib/marketing-types";
import { getMarketingDashboardAction } from "@/app/actions-marketing";
import { exportMarketingExecutiveExcel } from "@/lib/marketing-export";
import { CustomSelect } from "@/components/custom-select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export function MarketingOverview() {
  const [filter, setFilter] = useState<MarketingFilter>({
    dateRange: "this_month",
    branchId: "all",
    channel: "all",
  });
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [kpis, setKpis] = useState<ExecutiveKPISummary | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [channelComparison, setChannelComparison] = useState<ChannelComparisonPoint[]>([]);
  const [adPerformance, setAdPerformance] = useState<AdPerformancePoint[]>([]);
  const [branchPerformance, setBranchPerformance] = useState<BranchPerformanceRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = (activeFilter: MarketingFilter) => {
    startTransition(async () => {
      setErrorMsg(null);
      const res = await getMarketingDashboardAction(activeFilter);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.data) {
        setKpis(res.data.kpis);
        setTrendData(res.data.trendData);
        setChannelComparison(res.data.channelComparison);
        setAdPerformance(res.data.adPerformance);
        setBranchPerformance(res.data.branchPerformance);
      }
    });
  };

  useEffect(() => {
    loadData(filter);
  }, [filter.dateRange, filter.branchId, filter.channel]);

  const handleApplyCustomDate = () => {
    if (!customStart || !customEnd) return;
    const newFilter: MarketingFilter = {
      ...filter,
      dateRange: "custom",
      startDate: customStart,
      endDate: customEnd,
    };
    setFilter(newFilter);
    loadData(newFilter);
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  const formatMoney = (num: number | undefined | null) => {
    if (num === null || num === undefined || isNaN(num)) return "0 đ";
    return new Intl.NumberFormat("vi-VN").format(num) + " đ";
  };

  const renderTrendBadge = (current: number, prev: number, invert = false) => {
    if (prev === 0 && current === 0) {
      return <span className="text-[11px] text-slate-400 font-medium">0% vs kỳ trước</span>;
    }
    const diff = prev === 0 ? 100 : ((current - prev) / prev) * 100;
    const isPositive = diff > 0;
    const isGood = invert ? !isPositive : isPositive;
    const sign = isPositive ? "+" : "";
    const color = isGood ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50";

    return (
      <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-sm ${color}`}>
        {isPositive ? "↑" : "↓"} {sign}{diff.toFixed(1)}% vs kỳ trước
      </span>
    );
  };

  const getDateRangeLabel = () => {
    if (filter.dateRange === "today") return "Hôm nay";
    if (filter.dateRange === "7days") return "7 ngày gần nhất";
    if (filter.dateRange === "this_month") return "Tháng này";
    if (filter.dateRange === "last_month") return "Tháng trước";
    if (filter.dateRange === "custom") return `${filter.startDate} đến ${filter.endDate}`;
    return "Tháng này";
  };

  const handleExportExcel = async () => {
    if (!kpis) return;
    setIsExporting(true);
    try {
      await exportMarketingExecutiveExcel({
        kpis,
        channelComparison,
        adPerformance,
        branchPerformance,
        filter,
        dateRangeDisplay: getDateRangeLabel(),
      });
    } catch (err) {
      console.error("Export error", err);
      alert("Không thể xuất file Excel. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* ================= 1. BỘ LỌC ĐẦU TRANG ================= */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Khoảng thời gian:
            </span>
            {(
              [
                { id: "today", label: "Hôm nay" },
                { id: "7days", label: "7 ngày qua" },
                { id: "this_month", label: "Tháng này" },
                { id: "last_month", label: "Tháng trước" },
                { id: "custom", label: "Tùy chỉnh" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter({ ...filter, dateRange: t.id })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filter.dateRange === t.id
                    ? "bg-primary text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Quick Actions: Xuất Excel & In/PDF */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Xuất báo cáo tổng hợp ra file Excel"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{isExporting ? "Đang xuất..." : "Xuất Excel"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="In báo cáo hoặc lưu định dạng PDF"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>In / PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Row 2: Chi nhánh & Kênh & Tùy chỉnh ngày */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Chi nhánh:</span>
            <CustomSelect
              value={filter.branchId || "all"}
              onChange={(val) => setFilter({ ...filter, branchId: String(val) })}
              options={[
                { value: "all", label: "Tất cả chi nhánh" },
                ...HATICO_BRANCHES.map((b) => ({
                  value: b.id,
                  label: b.name,
                })),
              ]}
              className="w-48"
              size="sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Kênh:</span>
            <CustomSelect
              value={filter.channel || "all"}
              onChange={(val) => setFilter({ ...filter, channel: val as any })}
              options={[
                { value: "all", label: "Tất cả kênh" },
                { value: "facebook", label: "Facebook" },
                { value: "tiktok", label: "TikTok" },
                { value: "youtube", label: "YouTube" },
                { value: "website", label: "Website" },
                { value: "ads", label: "Chiến dịch Ads" },
              ]}
              className="w-40"
              size="sm"
            />
          </div>

          {filter.dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
              <span className="text-xs text-slate-400">→</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
              <button
                type="button"
                onClick={handleApplyCustomDate}
                className="px-2.5 py-1 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer"
              >
                Áp dụng
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* ================= 2. 8 KPI CARDS CHÍNH ================= */}
      {kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Tổng bài viết/video */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nội dung đã đăng</span>
              <span className="p-1 rounded-md bg-blue-50 text-blue-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{formatNumber(kpis.totalContents)}</p>
            <div className="mt-1.5 flex items-center justify-between">
              {renderTrendBadge(kpis.totalContents, kpis.prevTotalContents)}
            </div>
          </div>

          {/* Card 2: Lượt xem */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng lượt xem</span>
              <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{formatNumber(kpis.totalViews)}</p>
            <div className="mt-1.5 flex items-center justify-between">
              {renderTrendBadge(kpis.totalViews, kpis.prevTotalViews)}
            </div>
          </div>

          {/* Card 3: Tương tác */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng tương tác</span>
              <span className="p-1 rounded-md bg-purple-50 text-purple-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{formatNumber(kpis.totalInteractions)}</p>
            <div className="mt-1.5 flex items-center justify-between">
              {renderTrendBadge(kpis.totalInteractions, kpis.prevTotalInteractions)}
            </div>
          </div>

          {/* Card 4: Khách quan tâm */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Khách quan tâm</span>
              <span className="p-1 rounded-md bg-amber-50 text-amber-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </span>
            </div>
            <p className="text-2xl font-black text-amber-600 tracking-tight">{formatNumber(kpis.totalLeads)}</p>
            <div className="mt-1.5 flex items-center justify-between">
              {renderTrendBadge(kpis.totalLeads, kpis.prevTotalLeads)}
            </div>
          </div>

          {/* Card 5: Khách được tư vấn */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đã tư vấn</span>
              <span className="p-1 rounded-md bg-sky-50 text-sky-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{formatNumber(kpis.totalConsulted)}</p>
            <div className="mt-1.5 flex items-center justify-between">
              {renderTrendBadge(kpis.totalConsulted, kpis.prevTotalConsulted)}
            </div>
          </div>

          {/* Card 6: Chuyển đổi thực tế */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Chuyển đổi thực tế</span>
              <span className="p-1 rounded-md bg-teal-50 text-teal-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <p className="text-2xl font-black text-teal-700 tracking-tight">{formatNumber(kpis.totalConverted)}</p>
            <div className="mt-1.5 flex items-center justify-between">
              {renderTrendBadge(kpis.totalConverted, kpis.prevTotalConverted)}
            </div>
          </div>

          {/* Card 7: Đơn chốt thành công */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đơn hàng chốt</span>
              <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">{formatNumber(kpis.totalOrders)}</p>
            <div className="mt-1.5 flex items-center justify-between">
              {renderTrendBadge(kpis.totalOrders, kpis.prevTotalOrders)}
            </div>
          </div>

          {/* Card 8: Tổng chi phí quảng cáo */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Chi phí Ads</span>
              <span className="p-1 rounded-md bg-rose-50 text-rose-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight truncate">
              {formatMoney(kpis.totalAdCost)}
            </p>
            <div className="mt-1.5 flex items-center justify-between">
              {renderTrendBadge(kpis.totalAdCost, kpis.prevTotalAdCost, true)}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-44 bg-white rounded-xl border border-slate-200/80 flex items-center justify-center">
          <p className="text-xs text-slate-400">Đang tải chỉ số KPI...</p>
        </div>
      )}

      {/* ================= 3. BA BIỂU ĐỒ RECHARTS TRỰC QUAN ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Biểu đồ 1: Xu hướng hiệu quả Marketing */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">1. Xu hướng hiệu quả Marketing</h3>
              <p className="text-[11px] text-slate-500">Khách quan tâm, đã tư vấn & đơn hàng chốt</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="leads" name="Khách quan tâm" stroke="#d97706" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="consulted" name="Đã tư vấn" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="orders" name="Đơn chốt" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ 2: So sánh kênh */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">2. So sánh kênh Marketing</h3>
              <p className="text-[11px] text-slate-500">Khách quan tâm và đơn chốt giữa các kênh</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="channel" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="leads" name="Khách quan tâm" fill="#0f2d59" radius={[4, 4, 0, 0]} />
                <Bar dataKey="orders" name="Đơn chốt" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Biểu đồ 3: Hiệu quả quảng cáo Ads */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">3. Hiệu quả chiến dịch quảng cáo (Ads)</h3>
            <p className="text-[11px] text-slate-500">So sánh chi phí, lượng khách và CPL</p>
          </div>
          {kpis && (
            <div className="flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <span className="text-slate-600 font-medium">
                CPL trung bình: <strong className="text-slate-900 font-bold">{kpis.cpl ? formatMoney(kpis.cpl) : "—"}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-medium">
                Chi phí/đơn: <strong className="text-slate-900 font-bold">{kpis.costPerOrder ? formatMoney(kpis.costPerOrder) : "—"}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {adPerformance.map((ad) => (
            <div key={ad.channel} className="p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{ad.channel}</span>
                <span className="text-xs font-bold text-rose-600">{formatMoney(ad.cost)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200/60">
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500">Khách quan tâm</p>
                  <p className="text-sm font-bold text-slate-800">{formatNumber(ad.leads)}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500">Đơn chốt</p>
                  <p className="text-sm font-bold text-emerald-700">{formatNumber(ad.orders)}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500">CPL</p>
                  <p className="text-sm font-bold text-primary">{ad.cpl ? formatMoney(ad.cpl) : "—"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

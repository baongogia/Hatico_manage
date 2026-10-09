"use client";

import React from "react";
import {
  CalculatedExecutiveKPIs,
  compareMetrics,
  hasValue,
  formatNumber,
  formatPercent,
  formatCompactNumber,
  formatCompactVND,
} from "@/lib/weekly-marketing-calculator";

interface WeeklyKpiSummaryProps {
  currentKpis: CalculatedExecutiveKPIs;
  previousKpis?: CalculatedExecutiveKPIs | null;
  qualifiedLeads?: number | null;
  previousQualifiedLeads?: number | null;
}

export function WeeklyKpiSummary({
  currentKpis,
  previousKpis,
  qualifiedLeads,
  previousQualifiedLeads,
}: WeeklyKpiSummaryProps) {
  const prev = previousKpis || null;

  // Comparison helpers
  const leadsDiff = prev && hasValue(currentKpis.totalLeads) && hasValue(prev.totalLeads)
    ? compareMetrics(currentKpis.totalLeads, prev.totalLeads, true)
    : null;

  const qualDiff = hasValue(qualifiedLeads) && hasValue(previousQualifiedLeads)
    ? compareMetrics(qualifiedLeads, previousQualifiedLeads, true)
    : null;

  const convDiff = prev && hasValue(currentKpis.totalConversions) && hasValue(prev.totalConversions)
    ? compareMetrics(currentKpis.totalConversions, prev.totalConversions, true)
    : null;

  const revDiff = prev && hasValue(currentKpis.revenueGenerated) && hasValue(prev.revenueGenerated)
    ? compareMetrics(currentKpis.revenueGenerated, prev.revenueGenerated, true)
    : null;

  const convRateDiff = prev && hasValue(currentKpis.conversionRate) && hasValue(prev.conversionRate)
    ? {
        diffVal: Number(((currentKpis.conversionRate as number) - (prev.conversionRate as number)).toFixed(1)),
        isGood: (currentKpis.conversionRate as number) >= (prev.conversionRate as number),
      }
    : null;

  const spendDiff = prev && hasValue(currentKpis.totalAdSpend) && hasValue(prev.totalAdSpend)
    ? compareMetrics(currentKpis.totalAdSpend, prev.totalAdSpend, false)
    : null;

  const cplDiff = prev && hasValue(currentKpis.costPerLead) && hasValue(prev.costPerLead)
    ? compareMetrics(currentKpis.costPerLead, prev.costPerLead, false)
    : null;

  // Preferred order of KPI cards:
  // 1. Leads, 2. Qualified Leads, 3. Customers, 4. Revenue, 5. Conversion Rate, 6. Ad Spend, 7. CPL, 8. Reach
  const allPossibleCards = [
    {
      id: "leads",
      show: hasValue(currentKpis.totalLeads),
      value: formatNumber(currentKpis.totalLeads),
      label: "Khách tiềm năng (Leads)",
      subtext: "SĐT, form đăng ký, gọi hotline",
      diff: leadsDiff,
      highlight: false,
    },
    {
      id: "qualified",
      show: hasValue(qualifiedLeads),
      value: formatNumber(qualifiedLeads),
      label: "Khách hàng đủ điều kiện",
      subtext: "Nhu cầu mua thực tế, đúng dòng xe",
      diff: qualDiff,
      highlight: false,
    },
    {
      id: "conversions",
      show: hasValue(currentKpis.totalConversions),
      value: `${formatNumber(currentKpis.totalConversions)} xe`,
      label: "Khách chốt hợp đồng",
      subtext: "Đã ký kết hợp đồng hoặc đặt cọc",
      diff: convDiff,
      highlight: true,
    },
    {
      id: "revenue",
      show: hasValue(currentKpis.revenueGenerated),
      value: formatCompactVND(currentKpis.revenueGenerated),
      label: "Doanh thu ước tính",
      subtext: "Giá trị hợp đồng ký kết",
      diff: revDiff,
      highlight: true,
    },
    {
      id: "convRate",
      show: hasValue(currentKpis.conversionRate),
      value: formatPercent(currentKpis.conversionRate),
      label: "Tỷ lệ chuyển đổi phễu",
      subtext: "Khách chốt / Tổng leads",
      diffRate: convRateDiff,
      highlight: false,
    },
    {
      id: "adSpend",
      show: hasValue(currentKpis.totalAdSpend),
      value: formatCompactVND(currentKpis.totalAdSpend),
      label: "Chi phí quảng cáo (Ads)",
      subtext: "Ngân sách tiếp thị số",
      diff: spendDiff,
      highlight: false,
    },
    {
      id: "cpl",
      show: hasValue(currentKpis.costPerLead),
      value: formatCompactVND(currentKpis.costPerLead),
      label: "Chi phí / Lead (CPL)",
      subtext: "Chi phí trên mỗi khách tiềm năng",
      diff: cplDiff,
      highlight: false,
    },
    {
      id: "reach",
      show: hasValue(currentKpis.totalReach) && !hasValue(currentKpis.totalLeads), // Show reach as fallback card if no leads
      value: formatCompactNumber(currentKpis.totalReach),
      label: "Tổng lượt tiếp cận",
      subtext: "Lượt hiển thị trên các kênh",
      highlight: false,
    },
  ];

  // ONLY RETAIN CARDS THAT ACTUALLY CONTAIN DATA
  const activeCards = allPossibleCards.filter((c) => c.show);

  // If no KPIs have data, do not render this section at all
  if (activeCards.length === 0) {
    return null;
  }

  // Responsive grid based on number of active cards
  const getGridColsClass = (count: number) => {
    if (count === 1) return "grid-cols-1 max-w-sm";
    if (count === 2) return "grid-cols-1 sm:grid-cols-2";
    if (count === 3) return "grid-cols-1 sm:grid-cols-3";
    if (count === 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  // Secondary metrics strip (only items with value)
  const secondaryItems = [
    { label: "Tiếp cận", value: formatCompactNumber(currentKpis.totalReach), show: hasValue(currentKpis.totalReach) },
    { label: "Lượt xem", value: formatCompactNumber(currentKpis.totalViews), show: hasValue(currentKpis.totalViews) },
    { label: "Tương tác", value: formatCompactNumber(currentKpis.totalEngagement), show: hasValue(currentKpis.totalEngagement) },
    { label: "Chi phí Ads", value: formatCompactVND(currentKpis.totalAdSpend), show: hasValue(currentKpis.totalAdSpend) && !activeCards.some(c => c.id === "adSpend") },
    { label: "CPL", value: formatCompactVND(currentKpis.costPerLead), show: hasValue(currentKpis.costPerLead) && !activeCards.some(c => c.id === "cpl") },
  ].filter((item) => item.show && item.value !== "");

  return (
    <div className="space-y-3.5">
      {/* DYNAMIC KPI CARDS: ONLY MEANINGFUL POPULATED METRICS */}
      <div className={`grid ${getGridColsClass(activeCards.length)} gap-3`}>
        {activeCards.map((card) => {
          const diffObj = card.diff;
          const diffRateObj = card.diffRate;

          return (
            <div
              key={card.id}
              className={`rounded-xl p-4 transition-all ${
                card.highlight
                  ? "bg-emerald-50/40 border border-emerald-200/60 shadow-2xs"
                  : "bg-white border border-slate-200/50 shadow-2xs hover:border-slate-300/80"
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-xs font-medium text-slate-500">
                  {card.label}
                </span>

                {diffObj && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      diffObj.isGood
                        ? "text-emerald-700 bg-emerald-50/90"
                        : "text-rose-700 bg-rose-50/90"
                    }`}
                  >
                    {diffObj.formattedDiff}
                  </span>
                )}

                {diffRateObj && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      diffRateObj.isGood
                        ? "text-emerald-700 bg-emerald-50/90"
                        : "text-rose-700 bg-rose-50/90"
                    }`}
                  >
                    {diffRateObj.diffVal >= 0 ? "↑" : "↓"} {Math.abs(diffRateObj.diffVal)} điểm %
                  </span>
                )}
              </div>

              <div className="text-3xl font-black text-slate-900 tracking-tight my-1">
                {card.value}
              </div>

              <div className="text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100/80 truncate">
                {card.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* DYNAMIC SECONDARY MARKETING STRIP (Only if populated secondary metrics exist) */}
      {secondaryItems.length > 0 && (
        <div className="bg-slate-50/70 rounded-xl px-4 py-2.5 border border-slate-100 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/70 inline-block" />
            <span className="text-xs font-semibold text-slate-600">
              Chỉ số truyền thông & quảng cáo:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-medium">
            {secondaryItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-slate-400">{item.label}:</span>
                <strong className="text-slate-800 font-bold">
                  {item.value}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

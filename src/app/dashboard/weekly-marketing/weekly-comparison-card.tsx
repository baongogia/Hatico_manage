"use client";

import React from "react";
import { WeeklyMarketingReport as ReportType } from "@/lib/weekly-marketing-types";
import {
  calculateExecutiveKPIs,
  compareMetrics,
  hasValue,
  formatCompactNumber,
  formatCompactVND,
} from "@/lib/weekly-marketing-calculator";

interface WeeklyComparisonCardProps {
  currentReport: ReportType;
  previousReport?: ReportType | null;
}

interface ComparisonMetricItem {
  id: string;
  name: string;
  currentValue: number | null;
  prevValue: number | null;
  formatType: "number" | "currency";
  higherIsBetter: boolean;
}

export function WeeklyComparisonCard({
  currentReport,
  previousReport,
}: WeeklyComparisonCardProps) {
  if (!previousReport) {
    return null;
  }

  const curKpi = calculateExecutiveKPIs(currentReport);
  const prevKpi = calculateExecutiveKPIs(previousReport);

  const curQualLeads = currentReport.leadMetrics?.qualifiedLeads ?? null;
  const prevQualLeads = previousReport.leadMetrics?.qualifiedLeads ?? null;

  const curWebTraffic = currentReport.websiteMetrics?.sessions ?? null;
  const prevWebTraffic = previousReport.websiteMetrics?.sessions ?? null;

  // The 7 potential key metrics
  const allMetrics: ComparisonMetricItem[] = [
    {
      id: "leads",
      name: "Khách tiềm năng (Leads)",
      currentValue: curKpi.totalLeads,
      prevValue: prevKpi.totalLeads,
      formatType: "number",
      higherIsBetter: true,
    },
    {
      id: "qualLeads",
      name: "Khách đủ điều kiện (Qualified)",
      currentValue: curQualLeads,
      prevValue: prevQualLeads,
      formatType: "number",
      higherIsBetter: true,
    },
    {
      id: "conversions",
      name: "Khách chốt đơn (Customers)",
      currentValue: curKpi.totalConversions,
      prevValue: prevKpi.totalConversions,
      formatType: "number",
      higherIsBetter: true,
    },
    {
      id: "reach",
      name: "Tổng tiếp cận (Reach)",
      currentValue: curKpi.totalReach,
      prevValue: prevKpi.totalReach,
      formatType: "number",
      higherIsBetter: true,
    },
    {
      id: "web",
      name: "Truy cập Website (Traffic)",
      currentValue: curWebTraffic,
      prevValue: prevWebTraffic,
      formatType: "number",
      higherIsBetter: true,
    },
    {
      id: "adSpend",
      name: "Chi phí Ads (Ngân sách)",
      currentValue: curKpi.totalAdSpend,
      prevValue: prevKpi.totalAdSpend,
      formatType: "currency",
      higherIsBetter: false,
    },
    {
      id: "cpl",
      name: "Chi phí / Lead (CPL)",
      currentValue: curKpi.costPerLead,
      prevValue: prevKpi.costPerLead,
      formatType: "currency",
      higherIsBetter: false,
    },
  ];

  // ONLY RETAIN METRICS WHERE AT LEAST ONE WEEK HAS DATA
  const activeMetrics = allMetrics.filter(
    (item) => hasValue(item.currentValue) || hasValue(item.prevValue)
  );

  if (activeMetrics.length === 0) {
    return null;
  }

  const formatVal = (val: number | null, type: "number" | "currency") => {
    if (!hasValue(val)) return "—";
    return type === "currency" ? formatCompactVND(val) : formatCompactNumber(val);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/50 p-4 shadow-2xs space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            So sánh hiệu suất với tuần trước
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tuần {currentReport.weekNumber} so với Tuần {previousReport.weekNumber}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
            <span>Tuần {currentReport.weekNumber} (Hiện tại)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />
            <span>Tuần {previousReport.weekNumber} (Trước)</span>
          </div>
        </div>
      </div>

      {/* Clean Comparative Metrics Grid (Only populated metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 pt-1">
        {activeMetrics.map((item) => {
          const comp = compareMetrics(
            item.currentValue,
            item.prevValue,
            item.higherIsBetter
          );
          const cVal = item.currentValue || 0;
          const pVal = item.prevValue || 0;
          const maxVal = Math.max(cVal, pVal, 1);
          const curPercent = item.currentValue !== null ? Math.min(100, Math.round((cVal / maxVal) * 100)) : 0;
          const prevPercent = item.prevValue !== null ? Math.min(100, Math.round((pVal / maxVal) * 100)) : 0;

          return (
            <div key={item.id} className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{item.name}</span>
                {comp ? (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      comp.isGood
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {comp.formattedDiff}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Mới tuần này</span>
                )}
              </div>

              {/* Dual Clean Proportional Bars */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 w-7 shrink-0 text-[11px]">T{currentReport.weekNumber}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${curPercent}%` }}
                    />
                  </div>
                  <span className="font-bold text-slate-900 w-20 text-right truncate">
                    {formatVal(item.currentValue, item.formatType)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 w-7 shrink-0 text-[11px]">T{previousReport.weekNumber}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-slate-300 h-full rounded-full transition-all duration-500"
                      style={{ width: `${prevPercent}%` }}
                    />
                  </div>
                  <span className="text-slate-400 w-20 text-right truncate text-[11px]">
                    {formatVal(item.prevValue, item.formatType)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

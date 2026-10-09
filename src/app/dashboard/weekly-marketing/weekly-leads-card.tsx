"use client";

import React from "react";
import { LeadMetrics } from "@/lib/weekly-marketing-types";
import {
  hasValue,
  hasAnyValue,
  formatNumber,
  formatCurrencyVND,
  formatCompactVND,
  formatPercent,
} from "@/lib/weekly-marketing-calculator";

interface WeeklyLeadsCardProps {
  metrics?: LeadMetrics | null;
}

export function WeeklyLeadsCard({ metrics }: WeeklyLeadsCardProps) {
  // Hide entire section if no lead metrics entered at all
  if (!metrics || !hasAnyValue(metrics)) {
    return null;
  }

  // Filter only rows that actually contain data
  const activeRows = (metrics.channelBreakdown || []).filter((r) =>
    hasAnyValue(r, ["leads", "qualifiedLeads", "conversions", "adSpend"])
  );

  if (activeRows.length === 0 && !hasValue(metrics.totalLeads) && !hasValue(metrics.convertedCustomers)) {
    return null;
  }

  const totalSpend = activeRows.reduce((sum, c) => sum + (c.adSpend || 0), 0);
  const totalLeads = hasValue(metrics.totalLeads)
    ? (metrics.totalLeads as number)
    : activeRows.reduce((sum, c) => sum + (c.leads || 0), 0);
  const totalQualified = hasValue(metrics.qualifiedLeads)
    ? (metrics.qualifiedLeads as number)
    : activeRows.reduce((sum, c) => sum + (c.qualifiedLeads || 0), 0);
  const totalCustomers = hasValue(metrics.convertedCustomers)
    ? (metrics.convertedCustomers as number)
    : activeRows.reduce((sum, c) => sum + (c.conversions || 0), 0);

  const overallConvRate = totalLeads > 0 && totalCustomers >= 0
    ? (totalCustomers / totalLeads) * 100
    : null;
  const overallCPL = totalLeads > 0 && totalSpend > 0
    ? Math.round(totalSpend / totalLeads)
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200/50 p-4 shadow-2xs space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Phân bổ khách hàng tiềm năng & ROI theo nguồn
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Đánh giá kênh mang lại khách hàng thực tế và chi phí trên mỗi lead
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          {hasValue(metrics.revenueGenerated) && (
            <div>
              Doanh thu ước tính:{" "}
              <strong className="text-emerald-700 font-bold">
                {formatCompactVND(metrics.revenueGenerated)}
              </strong>
            </div>
          )}
          {hasValue(overallConvRate) && (
            <div>
              Tỷ lệ chốt đơn:{" "}
              <strong className="text-primary font-bold">
                {formatPercent(overallConvRate)}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Attribution Table (Only populated rows) */}
      {activeRows.length > 0 && (
        <div className="border border-slate-100 rounded-xl overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[640px]">
            <thead className="bg-slate-50/70 text-slate-600 border-b border-slate-100 text-xs">
              <tr>
                <th className="py-2.5 px-3.5 font-bold">Nguồn tiếp thị</th>
                <th className="py-2.5 px-3 text-right font-bold">Leads</th>
                <th className="py-2.5 px-3 text-right font-bold">Khách đủ ĐK</th>
                <th className="py-2.5 px-3 text-right font-bold">Khách chốt</th>
                <th className="py-2.5 px-3 text-right font-bold">Tỷ lệ CĐ</th>
                <th className="py-2.5 px-3 text-right font-bold">Chi phí Ads</th>
                <th className="py-2.5 px-3.5 text-right font-bold">Chi phí / Lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {activeRows.map((ch, idx) => {
                const channelConvRate = hasValue(ch.leads) && (ch.leads as number) > 0 && hasValue(ch.conversions)
                  ? ((ch.conversions as number) / (ch.leads as number)) * 100
                  : null;
                const cpl = hasValue(ch.adSpend) && (ch.adSpend as number) > 0 && hasValue(ch.leads) && (ch.leads as number) > 0
                  ? Math.round((ch.adSpend as number) / (ch.leads as number))
                  : null;

                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3.5 font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 inline-block" />
                      <span>{ch.source}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {hasValue(ch.leads) ? formatNumber(ch.leads) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                      {hasValue(ch.qualifiedLeads) ? formatNumber(ch.qualifiedLeads) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                      {hasValue(ch.conversions) ? `${ch.conversions} xe` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                      {hasValue(channelConvRate) ? formatPercent(channelConvRate) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {hasValue(ch.adSpend) && (ch.adSpend as number) > 0 ? formatCurrencyVND(ch.adSpend) : "—"}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-semibold text-slate-700">
                      {hasValue(cpl) ? formatCurrencyVND(cpl) : hasValue(ch.leads) && (!hasValue(ch.adSpend) || ch.adSpend === 0) ? "Tự nhiên" : "—"}
                    </td>
                  </tr>
                );
              })}

              {/* TOTAL ROW */}
              <tr className="bg-slate-50/90 font-bold text-slate-900 border-t border-slate-200">
                <td className="py-2.5 px-3.5 text-xs font-bold text-slate-900">Tổng cộng</td>
                <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatNumber(totalLeads)}</td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatNumber(totalQualified)}</td>
                <td className="py-2.5 px-3 text-right font-black text-emerald-700">{totalCustomers} xe</td>
                <td className="py-2.5 px-3 text-right font-bold text-primary">{hasValue(overallConvRate) ? formatPercent(overallConvRate) : "—"}</td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900">{totalSpend > 0 ? formatCurrencyVND(totalSpend) : "—"}</td>
                <td className="py-2.5 px-3.5 text-right font-black text-primary">
                  {hasValue(overallCPL) ? formatCurrencyVND(overallCPL) : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

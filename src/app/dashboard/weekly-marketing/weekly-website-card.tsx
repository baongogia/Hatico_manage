"use client";

import React, { useState } from "react";
import { WebsiteMetrics } from "@/lib/weekly-marketing-types";
import {
  calculateWebsiteMetrics,
  hasValue,
  hasAnyValue,
  formatNumber,
  formatCompactNumber,
  formatPercent,
} from "@/lib/weekly-marketing-calculator";

interface WeeklyWebsiteCardProps {
  metrics?: WebsiteMetrics | null;
}

export function WeeklyWebsiteCard({ metrics }: WeeklyWebsiteCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // If no data entered for Website at all, hide entire card
  if (!metrics || !hasAnyValue(metrics)) {
    return null;
  }

  const calc = calculateWebsiteMetrics(metrics);

  // Construct only populated primary metrics
  const availableTiles: { label: string; value: string; isLead?: boolean; isHighlight?: boolean }[] = [];

  if (hasValue(metrics.sessions)) {
    availableTiles.push({ label: "Phiên truy cập", value: formatCompactNumber(metrics.sessions) });
  }
  if (hasValue(metrics.totalUsers)) {
    availableTiles.push({ label: "Người dùng", value: formatCompactNumber(metrics.totalUsers) });
  }
  if (hasValue(metrics.newUsers)) {
    availableTiles.push({ label: "Người dùng mới", value: formatCompactNumber(metrics.newUsers) });
  }
  if (hasValue(metrics.pageViews)) {
    availableTiles.push({ label: "Lượt xem trang", value: formatCompactNumber(metrics.pageViews) });
  }
  if (hasValue(metrics.leads)) {
    availableTiles.push({ label: "Leads từ Web", value: formatNumber(metrics.leads), isLead: true });
  }
  if (hasValue(metrics.qualifiedLeads)) {
    availableTiles.push({ label: "Khách đủ ĐK", value: formatNumber(metrics.qualifiedLeads), isLead: true });
  }
  if (hasValue(metrics.conversions)) {
    availableTiles.push({ label: "Khách chốt", value: `${formatNumber(metrics.conversions)} xe`, isLead: true });
  }
  if (hasValue(calc.customerConversionRate)) {
    availableTiles.push({ label: "Chốt từ Lead", value: formatPercent(calc.customerConversionRate), isHighlight: true });
  }
  if (hasValue(calc.leadConversionRate)) {
    availableTiles.push({ label: "Tỷ lệ ra Lead", value: formatPercent(calc.leadConversionRate) });
  }

  // Check if there are deeper metrics to expand
  const actionItems = [
    { label: "📝 Form liên hệ", value: metrics.contactFormSubmissions },
    { label: "📞 Bấm gọi Hotline", value: metrics.phoneCallClicks },
    { label: "💬 Bấm chat Zalo", value: metrics.zaloClicks },
    { label: "📑 Yêu cầu báo giá", value: metrics.quoteRequests },
  ].filter((item) => hasValue(item.value));

  const hasPages = metrics.topLandingPages && metrics.topLandingPages.length > 0;
  const hasSources = metrics.topTrafficSources && metrics.topTrafficSources.length > 0;
  const hasDetails = actionItems.length > 0 || hasPages || hasSources;

  return (
    <div className="bg-white rounded-xl border border-slate-200/50 p-4 shadow-2xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.53c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.4z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Website Hatico.vn</span>
              <span className="text-xs font-normal text-slate-400">Cổng báo giá rơ mooc</span>
            </h4>
            <p className="text-xs text-slate-500">
              {calc.formattedDuration ? `Thời lượng TB: ${calc.formattedDuration}` : "Lưu lượng truy cập web"}
              {hasValue(calc.leadConversionRate) ? ` · Tỷ lệ ra Lead: ${formatPercent(calc.leadConversionRate)}` : ""}
            </p>
          </div>
        </div>

        {hasDetails && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-primary hover:text-primary-hover px-2.5 py-1 rounded-lg hover:bg-slate-50 border border-slate-200/60 transition-colors cursor-pointer"
          >
            {isExpanded ? "Thu gọn" : "Xem chi tiết"}
          </button>
        )}
      </div>

      {/* Populated Metrics Row */}
      {availableTiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-1">
          {availableTiles.map((tile, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl ${
                tile.isLead
                  ? "bg-emerald-50/50"
                  : "bg-slate-50/70"
              }`}
            >
              <span
                className={`text-[11px] block font-medium ${
                  tile.isLead ? "text-emerald-800 font-semibold" : "text-slate-400"
                }`}
              >
                {tile.label}
              </span>
              <span
                className={`text-base block font-bold ${
                  tile.isLead
                    ? "font-black text-emerald-700"
                    : tile.isHighlight
                    ? "text-primary"
                    : "text-slate-900"
                }`}
              >
                {tile.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expandable Breakdown Details */}
      {isExpanded && hasDetails && (
        <div className="pt-3 border-t border-slate-100 space-y-3 animate-fade-in text-xs">
          {/* Action Conversions: only show entered actions */}
          {actionItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-50/60 p-2.5 rounded-xl">
              {actionItems.map((act, i) => (
                <div key={i}>
                  {act.label}: <strong className="font-semibold text-slate-800">{formatNumber(act.value)}</strong>
                </div>
              ))}
            </div>
          )}

          {/* Top Landing Pages & Sources Dual Tables */}
          {(hasPages || hasSources) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {hasPages && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500">Top trang đích xem nhiều nhất:</span>
                  <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-slate-100">
                        {metrics.topLandingPages?.slice(0, 4).map((p, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2.5 text-slate-700 truncate max-w-[170px]" title={p.title}>
                              {p.title}
                            </td>
                            <td className="py-1.5 px-2.5 text-right text-slate-500 font-medium">
                              {hasValue(p.views) ? formatNumber(p.views) : "—"}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-bold text-emerald-700">
                              {hasValue(p.leads) ? `${p.leads} L` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {hasSources && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500">Nguồn truy cập chính (Traffic Sources):</span>
                  <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-slate-100">
                        {metrics.topTrafficSources?.map((s, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2.5 font-medium text-slate-700">{s.source}</td>
                            <td className="py-1.5 px-2.5 text-right text-slate-500 font-medium">
                              {hasValue(s.sessions) ? formatNumber(s.sessions) : "—"}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-bold text-emerald-700">
                              {hasValue(s.leads) ? `${s.leads} L` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

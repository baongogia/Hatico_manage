"use client";

import React, { useState } from "react";
import { TiktokMetrics } from "@/lib/weekly-marketing-types";
import {
  calculateTiktokMetrics,
  hasValue,
  hasAnyValue,
  formatNumber,
  formatCompactNumber,
  formatCompactVND,
  formatPercent,
} from "@/lib/weekly-marketing-calculator";

interface WeeklyTiktokCardProps {
  metrics?: TiktokMetrics | null;
}

export function WeeklyTiktokCard({ metrics }: WeeklyTiktokCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // If no data entered for TikTok at all, hide entire card
  if (!metrics || !hasAnyValue(metrics)) {
    return null;
  }

  const calc = calculateTiktokMetrics(metrics);

  const hasPaidAds = hasAnyValue(metrics, [
    "adSpend",
    "adImpressions",
    "adReach",
    "adClicks",
    "adLeads",
    "adConversions",
  ]);

  // Construct only populated primary metrics
  const availableTiles: { label: string; value: string; isLead?: boolean; isHighlight?: boolean }[] = [];

  if (hasValue(metrics.totalViews)) {
    availableTiles.push({ label: "Lượt xem", value: formatCompactNumber(metrics.totalViews) });
  }
  if (hasValue(metrics.uniqueReach)) {
    availableTiles.push({ label: "Tiếp cận", value: formatCompactNumber(metrics.uniqueReach) });
  }
  if (hasValue(metrics.newFollowers)) {
    availableTiles.push({ label: "Follower mới", value: `+${formatNumber(metrics.newFollowers)}` });
  }
  if (hasValue(calc.followerGrowthRate)) {
    availableTiles.push({ label: "Tăng trưởng follower", value: formatPercent(calc.followerGrowthRate) });
  }
  if (hasValue(metrics.videosPublished)) {
    availableTiles.push({ label: "Video đăng", value: `${formatNumber(metrics.videosPublished)} video` });
  }
  if (hasValue(metrics.leads)) {
    availableTiles.push({ label: "Leads từ Video", value: formatNumber(metrics.leads), isLead: true });
  }
  if (hasValue(metrics.adLeads)) {
    availableTiles.push({ label: "Leads từ Ads", value: formatNumber(metrics.adLeads), isLead: true });
  }
  if (hasValue(metrics.adSpend)) {
    availableTiles.push({ label: "Chi phí Ads", value: formatCompactVND(metrics.adSpend), isHighlight: true });
  }
  if (hasValue(calc.cpl)) {
    availableTiles.push({ label: "CPL", value: formatCompactVND(calc.cpl), isHighlight: true });
  }

  // Check if there are deeper metrics to expand
  const hasInteractions = [metrics.likes, metrics.comments, metrics.shares, metrics.saves].some(hasValue);
  const hasBestVideo = hasValue(metrics.bestVideoTitle);
  const hasAdsDetail = hasPaidAds && [metrics.adImpressions, metrics.adClicks, calc.ctr].some(hasValue);
  const hasNotes = hasValue(metrics.notes);
  const hasDetails = hasInteractions || hasBestVideo || hasAdsDetail || hasNotes;

  return (
    <div className="bg-white rounded-xl border border-slate-200/50 p-4 shadow-2xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.23-.45-.48-.64-.73v7.28c-.08 3.26-2.01 6.34-5.11 7.4-3.1 1.13-6.85.34-9.06-2-2.31-2.39-2.73-6.27-1.02-9.14 1.7-2.92 5.29-4.48 8.59-3.79v4.2c-1.84-.46-3.87.21-4.79 1.83-.97 1.67-.54 3.98 1.02 5.16 1.54 1.19 3.93.98 5.2-.44.59-.65.75-1.51.74-2.36.01-4.07.01-8.14.01-12.21-.01-.32-.03-.64-.03-.96z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>TikTok</span>
              <span className="text-xs font-normal text-slate-400">@hatico.somitomooc</span>
            </h4>
            <p className="text-xs text-slate-500">
              {hasValue(metrics.videosPublished) ? `${metrics.videosPublished} video đăng tuần này` : "Kênh video ngắn"}
              {hasValue(calc.engagementRate) ? ` · Tương tác: ${formatPercent(calc.engagementRate)}` : ""}
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

      {/* Expandable Detailed Metrics (Only populated fields) */}
      {isExpanded && hasDetails && (
        <div className="pt-3 border-t border-slate-100 space-y-3 animate-fade-in text-xs">
          {/* Detailed Interactions: only show entered metrics */}
          {hasInteractions && (
            <div className="flex flex-wrap items-center gap-3 text-slate-600 bg-slate-50/60 p-2.5 rounded-xl">
              {hasValue(metrics.likes) && (
                <div>❤️ Thích: <strong className="text-slate-900 font-semibold">{formatNumber(metrics.likes)}</strong></div>
              )}
              {hasValue(metrics.comments) && (
                <div>💬 Bình luận: <strong className="text-slate-900 font-semibold">{formatNumber(metrics.comments)}</strong></div>
              )}
              {hasValue(metrics.shares) && (
                <div>↗️ Chia sẻ: <strong className="text-slate-900 font-semibold">{formatNumber(metrics.shares)}</strong></div>
              )}
              {hasValue(metrics.saves) && (
                <div>🔖 Đã lưu: <strong className="text-slate-900 font-semibold">{formatNumber(metrics.saves)}</strong></div>
              )}
            </div>
          )}

          {/* Best Video: only if entered */}
          {hasBestVideo && (
            <div className="p-2.5 rounded-xl bg-slate-50/80 text-xs flex items-center justify-between gap-3">
              <div className="truncate">
                <span className="text-[11px] font-semibold text-slate-500">Video tốt nhất tuần:</span>
                <p className="font-semibold text-slate-800 truncate mt-0.5">{metrics.bestVideoTitle}</p>
              </div>
              {hasValue(metrics.bestVideoViews) && (
                <div className="text-right shrink-0">
                  <span className="font-bold text-slate-900">{formatCompactNumber(metrics.bestVideoViews)} view</span>
                </div>
              )}
            </div>
          )}

          {/* Paid Ads details: only if paid ads data entered */}
          {hasPaidAds && (
            <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs flex flex-wrap items-center gap-4">
              {hasValue(metrics.adImpressions) && (
                <div>Hiển thị Ads: <strong className="font-semibold">{formatCompactNumber(metrics.adImpressions)}</strong></div>
              )}
              {hasValue(metrics.adClicks) && (
                <div>Clicks: <strong className="font-semibold">{formatNumber(metrics.adClicks)}</strong></div>
              )}
              {hasValue(calc.ctr) && (
                <div>CTR: <strong className="font-semibold">{formatPercent(calc.ctr)}</strong></div>
              )}
              {hasValue(calc.cpc) && (
                <div>CPC: <strong className="font-semibold">{formatCompactVND(calc.cpc)}</strong></div>
              )}
              {hasValue(calc.cpl) && (
                <div>CPL: <strong className="font-semibold text-primary">{formatCompactVND(calc.cpl)}</strong></div>
              )}
            </div>
          )}

          {hasNotes && (
            <p className="text-xs text-slate-500 italic">
              * {metrics.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { FacebookMetrics } from "@/lib/weekly-marketing-types";
import {
  calculateFacebookMetrics,
  hasValue,
  hasAnyValue,
  formatNumber,
  formatCompactNumber,
  formatCompactVND,
  formatPercent,
} from "@/lib/weekly-marketing-calculator";

interface WeeklyFacebookCardProps {
  metrics?: FacebookMetrics | null;
}

export function WeeklyFacebookCard({ metrics }: WeeklyFacebookCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // If no data entered for Facebook at all, hide entire card
  if (!metrics || !hasAnyValue(metrics)) {
    return null;
  }

  const calc = calculateFacebookMetrics(metrics);

  const hasPaidAds = hasAnyValue(metrics, [
    "adSpend",
    "adReach",
    "adImpressions",
    "adFrequency",
    "adLinkClicks",
    "adLeads",
    "adConversions",
  ]);

  // Construct only populated primary metrics
  const availableTiles: { label: string; value: string; isLead?: boolean; isHighlight?: boolean }[] = [];

  if (hasValue(metrics.reach)) {
    availableTiles.push({ label: "Tiếp cận", value: formatCompactNumber(metrics.reach) });
  }
  if (hasValue(calc.totalEngagement)) {
    availableTiles.push({ label: "Tương tác", value: formatCompactNumber(calc.totalEngagement) });
  }
  if (hasValue(metrics.newFollowers)) {
    availableTiles.push({ label: "Follower mới", value: `+${formatNumber(metrics.newFollowers)}` });
  }
  if (hasValue(metrics.postsPublished)) {
    availableTiles.push({ label: "Bài đăng", value: `${formatNumber(metrics.postsPublished)} bài` });
  }
  if (hasValue(metrics.leads)) {
    availableTiles.push({ label: "Leads từ Fanpage", value: formatNumber(metrics.leads), isLead: true });
  }
  if (hasValue(metrics.qualifiedLeads)) {
    availableTiles.push({ label: "Khách đủ ĐK", value: formatNumber(metrics.qualifiedLeads), isLead: true });
  }
  if (hasValue(metrics.conversions)) {
    availableTiles.push({ label: "Khách chốt", value: `${formatNumber(metrics.conversions)} xe`, isLead: true });
  }
  if (hasValue(metrics.adSpend)) {
    availableTiles.push({ label: "Chi phí Ads", value: formatCompactVND(metrics.adSpend), isHighlight: true });
  }
  if (hasValue(calc.cpl)) {
    availableTiles.push({ label: "CPL", value: formatCompactVND(calc.cpl), isHighlight: true });
  }

  // Check if there are deeper metrics to expand
  const hasInteractions = [metrics.likes, metrics.comments, metrics.shares, metrics.messagesStarted, metrics.linkClicks].some(hasValue);
  const hasBestPost = hasValue(metrics.bestPostTitle);
  const hasAdsDetail = hasPaidAds && [metrics.adImpressions, metrics.adLinkClicks, calc.ctr, calc.cpm].some(hasValue);
  const hasDetails = hasInteractions || hasBestPost || hasAdsDetail;

  return (
    <div className="bg-white rounded-xl border border-slate-200/50 p-4 shadow-2xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Facebook</span>
              <span className="text-xs font-normal text-slate-400">Fanpage chính thức</span>
            </h4>
            <p className="text-xs text-slate-500">
              {hasValue(metrics.postsPublished) ? `${metrics.postsPublished} bài đăng tuần này` : "Fanpage chính thức"}
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

      {/* Expandable Detailed Breakdown (Only populated fields) */}
      {isExpanded && hasDetails && (
        <div className="pt-3 border-t border-slate-100 space-y-3 animate-fade-in text-xs">
          {/* Detailed interactions */}
          {hasInteractions && (
            <div className="flex flex-wrap items-center gap-3 text-slate-600 bg-slate-50/60 p-2.5 rounded-xl">
              {hasValue(metrics.likes) && (
                <div>👍 Thích: <strong className="text-slate-900 font-semibold">{formatNumber(metrics.likes)}</strong></div>
              )}
              {hasValue(metrics.comments) && (
                <div>💬 Bình luận: <strong className="text-slate-900 font-semibold">{formatNumber(metrics.comments)}</strong></div>
              )}
              {hasValue(metrics.shares) && (
                <div>↗️ Chia sẻ: <strong className="text-slate-900 font-semibold">{formatNumber(metrics.shares)}</strong></div>
              )}
              {hasValue(metrics.messagesStarted) && (
                <div>✉️ Tin nhắn mới: <strong className="text-slate-900 font-semibold">{formatNumber(metrics.messagesStarted)}</strong></div>
              )}
              {hasValue(metrics.linkClicks) && (
                <div>🔗 Click link: <strong className="text-slate-900 font-semibold">{formatNumber(metrics.linkClicks)}</strong></div>
              )}
            </div>
          )}

          {/* Best post of the week */}
          {hasBestPost && (
            <div className="p-2.5 rounded-xl bg-slate-50/80 text-xs flex items-center justify-between gap-3">
              <div className="truncate">
                <span className="text-[11px] font-semibold text-slate-500">Bài viết nổi bật:</span>
                <p className="font-semibold text-slate-800 truncate mt-0.5">{metrics.bestPostTitle}</p>
              </div>
              {hasValue(metrics.qualifiedLeads) && (
                <div className="text-right shrink-0">
                  <span className="font-bold text-emerald-700">{metrics.qualifiedLeads} khách tiềm năng</span>
                </div>
              )}
            </div>
          )}

          {/* Paid Ads details */}
          {hasPaidAds && (
            <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs flex flex-wrap items-center gap-4">
              {hasValue(metrics.adImpressions) && (
                <div>Hiển thị: <strong className="font-semibold">{formatCompactNumber(metrics.adImpressions)}</strong></div>
              )}
              {hasValue(metrics.adLinkClicks) && (
                <div>Click link: <strong className="font-semibold">{formatNumber(metrics.adLinkClicks)}</strong></div>
              )}
              {hasValue(calc.ctr) && (
                <div>CTR: <strong className="font-semibold">{formatPercent(calc.ctr)}</strong></div>
              )}
              {hasValue(calc.cpm) && (
                <div>CPM: <strong className="font-semibold">{formatCompactVND(calc.cpm)}</strong></div>
              )}
              {hasValue(calc.cpl) && (
                <div>CPL: <strong className="font-semibold text-primary">{formatCompactVND(calc.cpl)}</strong></div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { ContentItem, ContentStatus } from "@/lib/weekly-marketing-types";
import { hasValue, formatNumber, formatCompactNumber } from "@/lib/weekly-marketing-calculator";

interface WeeklyContentTableProps {
  contentItems?: ContentItem[] | null;
  onAddContent?: () => void;
  isEditable?: boolean;
}

export function WeeklyContentTable({
  contentItems,
  onAddContent,
  isEditable = false,
}: WeeklyContentTableProps) {
  // Filter only items that actually contain title or meaningful data
  const validItems = (contentItems || []).filter((item) => hasValue(item.title));

  // If no content data exists and not in edit mode, hide the entire section!
  if (validItems.length === 0 && !isEditable) {
    return null;
  }

  const getStatusBadge = (status: ContentStatus) => {
    switch (status) {
      case "Xuất sắc":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
            Xuất sắc
          </span>
        );
      case "Tốt":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
            Tốt
          </span>
        );
      case "Trung bình":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
            Trung bình
          </span>
        );
      case "Cần cải thiện":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">
            Cần cải thiện
          </span>
        );
      default:
        return null;
    }
  };

  const getRankBadge = (rank?: number | null) => {
    if (rank === 1) {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900"
          title="Top 1 nội dung hiệu quả nhất"
        >
          🥇 Top 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 text-slate-800"
          title="Top 2 nội dung hiệu quả nhất"
        >
          🥈 Top 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60"
          title="Top 3 nội dung hiệu quả nhất"
        >
          🥉 Top 3
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/50 p-4 shadow-2xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>Hiệu quả nội dung xuất bản trong tuần</span>
            <span className="text-xs font-normal text-slate-400">
              ({validItems.length} ấn phẩm)
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Các bài viết và video xuất bản trên TikTok & Fanpage
          </p>
        </div>

        {isEditable && onAddContent && (
          <button
            type="button"
            onClick={onAddContent}
            className="text-xs font-semibold text-primary hover:text-primary-hover px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
          >
            + Thêm nội dung
          </button>
        )}
      </div>

      {/* Clean Table */}
      <div className="border border-slate-100 rounded-xl overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[680px]">
          <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-100 text-xs">
            <tr>
              <th className="py-2.5 px-3 font-semibold w-24">Nền tảng</th>
              <th className="py-2.5 px-3 font-semibold">Nội dung</th>
              <th className="py-2.5 px-3 font-semibold w-24">Ngày đăng</th>
              <th className="py-2.5 px-3 text-right font-semibold">Views / Reach</th>
              <th className="py-2.5 px-3 text-right font-semibold">Tương tác</th>
              <th className="py-2.5 px-3 text-right font-semibold">Leads</th>
              <th className="py-2.5 px-3 text-center font-semibold w-28">Hiệu suất</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {validItems.map((item) => {
              const engVals = [item.likes, item.comments, item.shares].filter(hasValue) as number[];
              const totalEngagement = engVals.length > 0 ? engVals.reduce((a, b) => a + b, 0) : null;

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50/60 transition-colors ${
                    item.rank === 1 ? "bg-amber-50/20" : ""
                  }`}
                >
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                      {item.platform}
                    </span>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      {item.rank && getRankBadge(item.rank)}
                      <span className="font-semibold text-slate-900 truncate max-w-[280px]" title={item.title}>
                        {item.title}
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 text-slate-400">
                    {item.publishDate ? item.publishDate.split("-").slice(1).join("/") : "—"}
                  </td>

                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {hasValue(item.viewsOrReach) ? formatCompactNumber(item.viewsOrReach) : "—"}
                  </td>

                  <td className="py-2.5 px-3 text-right text-slate-700 font-medium">
                    {hasValue(totalEngagement) ? formatNumber(totalEngagement) : "—"}
                  </td>

                  <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                    {hasValue(item.leads) && (item.leads as number) > 0 ? `${item.leads} L` : hasValue(item.leads) ? "0" : "—"}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    {getStatusBadge(item.status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

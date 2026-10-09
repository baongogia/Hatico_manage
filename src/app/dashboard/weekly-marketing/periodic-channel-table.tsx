import React, { useState } from "react";
import { ChannelResultRow, TopContentItem } from "@/lib/periodic-marketing-types";

interface PeriodicChannelTableProps {
  channels: ChannelResultRow[];
  totals: {
    contentCount: number;
    views: number;
    interactions: number;
    leads: number;
    consulted: number;
    converted: number;
    orders: number;
  };
  topContents: TopContentItem[];
}

export function PeriodicChannelTable({
  channels,
  totals,
  topContents,
}: PeriodicChannelTableProps) {
  const [showAllContents, setShowAllContents] = useState(false);

  const fb = channels.find((c) => c.platform === "facebook");
  const tt = channels.find((c) => c.platform === "tiktok");
  const yt = channels.find((c) => c.platform === "youtube");
  const ws = channels.find((c) => c.platform === "website");

  const displayedContents = showAllContents ? topContents : topContents.slice(0, 5);

  const formatVal = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return "—";
    return val.toLocaleString("vi-VN");
  };

  return (
    <div className="space-y-4">
      {/* 1. Main Channel Comparison Table */}
      <div className="overflow-x-auto border border-slate-200/90 rounded-[4px] bg-white shadow-2xs print:border-slate-300 print:shadow-none">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold">
              <th className="py-2.5 px-3 w-1/4">Chỉ số</th>
              <th className="py-2.5 px-3 text-right">Facebook</th>
              <th className="py-2.5 px-3 text-right">TikTok</th>
              <th className="py-2.5 px-3 text-right">YouTube</th>
              <th className="py-2.5 px-3 text-right">Website</th>
              <th className="py-2.5 px-3 text-right bg-slate-200/70 font-extrabold text-slate-900">
                Tổng
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-medium text-slate-900">Số bài viết/video</td>
              <td className="py-2 px-3 text-right">{formatVal(fb?.contentCount)}</td>
              <td className="py-2 px-3 text-right">{formatVal(tt?.contentCount)}</td>
              <td className="py-2 px-3 text-right">{formatVal(yt?.contentCount)}</td>
              <td className="py-2 px-3 text-right">{formatVal(ws?.contentCount)}</td>
              <td className="py-2 px-3 text-right font-bold bg-slate-50 text-slate-900">
                {formatVal(totals.contentCount)}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-medium text-slate-900">Lượt xem</td>
              <td className="py-2 px-3 text-right font-medium">{formatVal(fb?.views)}</td>
              <td className="py-2 px-3 text-right font-medium">{formatVal(tt?.views)}</td>
              <td className="py-2 px-3 text-right font-medium">{formatVal(yt?.views)}</td>
              <td className="py-2 px-3 text-right font-medium">{formatVal(ws?.views)}</td>
              <td className="py-2 px-3 text-right font-bold bg-slate-50 text-indigo-700">
                {formatVal(totals.views)}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-medium text-slate-900">Lượt tương tác</td>
              <td className="py-2 px-3 text-right">{formatVal(fb?.interactions)}</td>
              <td className="py-2 px-3 text-right">{formatVal(tt?.interactions)}</td>
              <td className="py-2 px-3 text-right">{formatVal(yt?.interactions)}</td>
              <td className="py-2 px-3 text-right text-slate-400">—</td>
              <td className="py-2 px-3 text-right font-bold bg-slate-50 text-purple-700">
                {formatVal(totals.interactions)}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-medium text-slate-900">Khách hàng quan tâm</td>
              <td className="py-2 px-3 text-right font-semibold text-amber-700">{formatVal(fb?.leads)}</td>
              <td className="py-2 px-3 text-right font-semibold text-amber-700">{formatVal(tt?.leads)}</td>
              <td className="py-2 px-3 text-right font-semibold text-amber-700">{formatVal(yt?.leads)}</td>
              <td className="py-2 px-3 text-right font-semibold text-amber-700">{formatVal(ws?.leads)}</td>
              <td className="py-2 px-3 text-right font-bold bg-slate-50 text-amber-800">
                {formatVal(totals.leads)}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-medium text-slate-900">Khách được tư vấn</td>
              <td className="py-2 px-3 text-right">{formatVal(fb?.consulted)}</td>
              <td className="py-2 px-3 text-right">{formatVal(tt?.consulted)}</td>
              <td className="py-2 px-3 text-right">{formatVal(yt?.consulted)}</td>
              <td className="py-2 px-3 text-right">{formatVal(ws?.consulted)}</td>
              <td className="py-2 px-3 text-right font-bold bg-slate-50 text-sky-700">
                {formatVal(totals.consulted)}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-medium text-slate-900">Khách chuyển đổi</td>
              <td className="py-2 px-3 text-right">{formatVal(fb?.converted)}</td>
              <td className="py-2 px-3 text-right">{formatVal(tt?.converted)}</td>
              <td className="py-2 px-3 text-right">{formatVal(yt?.converted)}</td>
              <td className="py-2 px-3 text-right">{formatVal(ws?.converted)}</td>
              <td className="py-2 px-3 text-right font-bold bg-slate-50 text-teal-700">
                {formatVal(totals.converted)}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-medium text-slate-900">Đơn chốt</td>
              <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatVal(fb?.orders)}</td>
              <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatVal(tt?.orders)}</td>
              <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatVal(yt?.orders)}</td>
              <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatVal(ws?.orders)}</td>
              <td className="py-2 px-3 text-right font-extrabold bg-slate-50 text-emerald-800">
                {formatVal(totals.orders)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. Top Content Performance List */}
      <div className="border border-slate-200/90 rounded-[4px] bg-white p-3.5 shadow-2xs print:border-slate-300 print:shadow-none">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <span>🔥</span>
            <span>Nội dung nổi bật trong kỳ (theo lượt xem)</span>
          </h4>
          {topContents.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllContents(!showAllContents)}
              className="text-xs text-primary hover:text-primary-hover font-semibold cursor-pointer no-print"
            >
              {showAllContents ? "Thu gọn (Top 5)" : `Xem tất cả (${topContents.length})`}
            </button>
          )}
        </div>

        {displayedContents.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-[4px]">
            Chưa có bài viết/video nào được ghi nhận trong kỳ báo cáo này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2 px-2.5 w-10 text-center">#</th>
                  <th className="py-2 px-2.5">Tên bài viết / video</th>
                  <th className="py-2 px-2.5">Kênh</th>
                  <th className="py-2 px-2.5">Ngày đăng</th>
                  <th className="py-2 px-2.5 text-right">Lượt xem</th>
                  <th className="py-2 px-2.5 text-right">Tương tác</th>
                  <th className="py-2 px-2.5 text-center no-print">Link bài</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {displayedContents.map((c, idx) => (
                  <tr key={c.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-2 px-2.5 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2.5 font-medium text-slate-900 max-w-xs truncate" title={c.title}>
                      {c.title}
                    </td>
                    <td className="py-2 px-2.5">
                      <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${
                        c.platformKey === "facebook"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : c.platformKey === "tiktok"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : c.platformKey === "youtube"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}>
                        {c.platform}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-slate-500 whitespace-nowrap">
                      {c.publishDate}
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                      {c.views.toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2 px-2.5 text-right text-slate-700">
                      {c.interactions.toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2 px-2.5 text-center no-print">
                      {c.link ? (
                        <a
                          href={c.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline font-semibold text-[11px]"
                        >
                          Mở link ↗
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

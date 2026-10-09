import React from "react";
import { PeriodicReportKPIs, KPICardComparison } from "@/lib/periodic-marketing-types";

interface PeriodicKpiCardsProps {
  kpis: PeriodicReportKPIs;
  comparison: Record<keyof PeriodicReportKPIs, KPICardComparison>;
  reportType: "weekly" | "monthly";
}

export function PeriodicKpiCards({ kpis, comparison, reportType }: PeriodicKpiCardsProps) {
  const compLabel = reportType === "weekly" ? "so với tuần trước" : "so với tháng trước";

  const cards: {
    key: keyof PeriodicReportKPIs;
    title: string;
    value: string;
    isCurrency?: boolean;
    colorClass: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "totalContents",
      title: "Tổng nội dung đã đăng",
      value: (kpis.totalContents || 0).toLocaleString("vi-VN"),
      colorClass: "text-blue-600 bg-blue-50 border-blue-100",
      icon: (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      key: "totalViews",
      title: "Tổng lượt xem",
      value: (kpis.totalViews || 0).toLocaleString("vi-VN"),
      colorClass: "text-indigo-600 bg-indigo-50 border-indigo-100",
      icon: (
        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      key: "totalInteractions",
      title: "Tổng lượt tương tác",
      value: (kpis.totalInteractions || 0).toLocaleString("vi-VN"),
      colorClass: "text-purple-600 bg-purple-50 border-purple-100",
      icon: (
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    {
      key: "totalLeads",
      title: "Tổng khách quan tâm",
      value: (kpis.totalLeads || 0).toLocaleString("vi-VN"),
      colorClass: "text-amber-600 bg-amber-50 border-amber-100",
      icon: (
        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      key: "totalConsulted",
      title: "Tổng khách được tư vấn",
      value: (kpis.totalConsulted || 0).toLocaleString("vi-VN"),
      colorClass: "text-sky-600 bg-sky-50 border-sky-100",
      icon: (
        <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      key: "totalConverted",
      title: "Khách chuyển đổi thực tế",
      value: (kpis.totalConverted || 0).toLocaleString("vi-VN"),
      colorClass: "text-teal-600 bg-teal-50 border-teal-100",
      icon: (
        <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: "totalOrders",
      title: "Đơn hàng chốt thành công",
      value: (kpis.totalOrders || 0).toLocaleString("vi-VN"),
      colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100",
      icon: (
        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      key: "totalAdSpend",
      title: "Tổng chi phí quảng cáo",
      value: `${(kpis.totalAdSpend || 0).toLocaleString("vi-VN")} ₫`,
      isCurrency: true,
      colorClass: "text-rose-600 bg-rose-50 border-rose-100",
      icon: (
        <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
      {cards.map((c) => {
        const comp = comparison?.[c.key];
        const diff = comp?.diff ?? 0;
        const percent = comp?.percent;

        const isPositive = diff > 0;
        const isNegative = diff < 0;

        return (
          <div
            key={c.key}
            className="p-3.5 bg-white border border-slate-200/90 rounded-[4px] shadow-2xs flex flex-col justify-between print:border-slate-300 print:shadow-none"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-semibold text-slate-500 leading-tight">
                {c.title}
              </span>
              <span className={`p-1 rounded-[4px] border ${c.colorClass} shrink-0`}>
                {c.icon}
              </span>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-none mb-1.5">
                {c.value}
              </div>

              {comp && comp.previous !== null ? (
                <div className="flex items-center gap-1 text-[10px] font-medium leading-none">
                  {isPositive && (
                    <span className="text-emerald-600 font-bold flex items-center">
                      ▲ +{c.isCurrency ? `${diff.toLocaleString("vi-VN")} ₫` : diff.toLocaleString("vi-VN")}
                      {percent !== null && ` (+${percent}%)`}
                    </span>
                  )}
                  {isNegative && (
                    <span className="text-rose-600 font-bold flex items-center">
                      ▼ {c.isCurrency ? `${diff.toLocaleString("vi-VN")} ₫` : diff.toLocaleString("vi-VN")}
                      {percent !== null && ` (${percent}%)`}
                    </span>
                  )}
                  {!isPositive && !isNegative && (
                    <span className="text-slate-400">Không đổi</span>
                  )}
                  <span className="text-slate-400 font-normal hidden lg:inline">
                    · {compLabel}
                  </span>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400">
                  Kỳ đầu tiên
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

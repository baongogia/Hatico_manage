"use client";

import React from "react";
import {
  CalculatedFunnel,
  formatCompactNumber,
  formatPercent,
  getFunnelBiggestDropoff,
} from "@/lib/weekly-marketing-calculator";

interface WeeklyFunnelCardProps {
  funnel: CalculatedFunnel;
}

export function WeeklyFunnelCard({ funnel }: WeeklyFunnelCardProps) {
  const { stages } = funnel;
  // If fewer than 2 stages exist, hide the funnel section completely
  if (!stages || stages.length < 2) return null;

  const topCount = stages[0].count || 1;
  const biggestDrop = getFunnelBiggestDropoff(funnel);

  const getGridColsClass = (count: number) => {
    if (count === 2) return "grid-cols-1 sm:grid-cols-2 max-w-md";
    if (count === 3) return "grid-cols-1 sm:grid-cols-3 max-w-2xl";
    if (count === 4) return "grid-cols-2 sm:grid-cols-4";
    if (count === 5) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6";
  };

  return (
    <div className="space-y-3">
      {/* Header with Title and Highlight badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800">
            Hành trình chuyển đổi khách hàng (Marketing Funnel)
          </h3>
          <span className="text-xs text-slate-400">
            {stages.map((s) => s.subLabel || s.label).join(" → ")}
          </span>
        </div>

        {biggestDrop && (
          <div className="text-[11px] font-medium text-amber-900 bg-amber-50/90 border border-amber-200/70 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Điểm rơi rớt lớn nhất:</span>
            <strong className="font-semibold">
              {biggestDrop.fromStage} → {biggestDrop.toStage} ({biggestDrop.rate}%)
            </strong>
          </div>
        )}
      </div>

      {/* Connected Conversion Journey: Only populated stages */}
      <div className="bg-slate-50/60 rounded-xl p-3 sm:p-4 border border-slate-100 shadow-2xs">
        <div className={`grid ${getGridColsClass(stages.length)} gap-2 relative`}>
          {stages.map((stage, idx) => {
            const isLast = idx === stages.length - 1;
            const isFirst = idx === 0;
            const isBiggestDropStage = biggestDrop && biggestDrop.stageIndex === idx;
            const widthPercent = Math.max(10, Math.round((stage.count / topCount) * 100));

            return (
              <div key={stage.label} className="relative flex flex-col">
                {/* Stage Box with unified styling */}
                <div
                  className={`flex-1 rounded-xl p-3 flex flex-col justify-between transition-all ${
                    isLast
                      ? "bg-emerald-50/80 border border-emerald-200/70 text-emerald-950 shadow-2xs"
                      : isBiggestDropStage
                      ? "bg-white border border-amber-200 text-slate-900 shadow-2xs"
                      : "bg-white border border-slate-200/50 text-slate-900 shadow-2xs hover:border-slate-300/80"
                  }`}
                >
                  {/* Stage Header & Conversion rate from previous */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1.5">
                      <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {idx + 1}
                        </span>
                        {stage.subLabel && (
                          <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-slate-400">
                            {stage.subLabel}
                          </span>
                        )}
                      </span>

                      {stage.rateFromPrevious !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isBiggestDropStage
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-100 text-slate-600"
                          }`}
                          title={`Tỷ lệ chuyển tiếp: ${formatPercent(stage.rateFromPrevious)}`}
                        >
                          ↓ {formatPercent(stage.rateFromPrevious)}
                        </span>
                      )}
                    </div>

                    {/* Stage Value */}
                    <div className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight my-1">
                      {formatCompactNumber(stage.count)}
                    </div>

                    {/* Stage Name */}
                    <div className="text-xs font-semibold text-slate-800 leading-snug">
                      {stage.label}
                    </div>

                    {/* Brief description */}
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1" title={stage.description}>
                      {stage.description}
                    </p>
                  </div>

                  {/* Relative Flow Progress Indicator */}
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLast
                            ? "bg-emerald-600"
                            : isFirst
                            ? "bg-slate-700"
                            : isBiggestDropStage
                            ? "bg-amber-500"
                            : "bg-primary"
                        }`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop Flow Arrow Connector to next stage */}
                {idx < stages.length - 1 && (
                  <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-white border border-slate-200 text-slate-400 items-center justify-center shadow-2xs pointer-events-none">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

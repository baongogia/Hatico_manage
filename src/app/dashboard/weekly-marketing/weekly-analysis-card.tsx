"use client";

import React from "react";
import { WeeklyAnalysis } from "@/lib/weekly-marketing-types";
import { hasValue } from "@/lib/weekly-marketing-calculator";

interface WeeklyAnalysisCardProps {
  analysis?: WeeklyAnalysis | null;
}

export function WeeklyAnalysisCard({ analysis }: WeeklyAnalysisCardProps) {
  if (!analysis) return null;

  const validHighlights = (analysis.highlights || []).filter(hasValue);
  const hasBestContent = hasValue(analysis.bestContentRationale);
  const validIssues = (analysis.issuesAndImprovements || []).filter(hasValue);
  const validPlans = (analysis.nextWeekPlan || []).filter(hasValue);
  const validRecs = (analysis.recommendations || []).filter(hasValue);

  // If no analysis subsection has any data, hide the entire section!
  const hasAnyReview =
    validHighlights.length > 0 ||
    hasBestContent ||
    validIssues.length > 0 ||
    validPlans.length > 0 ||
    validRecs.length > 0;

  if (!hasAnyReview) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/50 p-5 shadow-2xs space-y-4">
      <div className="border-b border-slate-100 pb-2.5">
        <h3 className="text-sm font-bold text-slate-800">
          Đánh giá tuần & Kế hoạch hành động
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Nhận định chuyên sâu của bộ phận Marketing trình Ban Giám Đốc
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Highlights: Only render if entered */}
        {validHighlights.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
              <span>Kết quả nổi bật</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 pl-3">
              {validHighlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-300">•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 2. Best Content Rationale: Only render if entered */}
        {hasBestContent && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
              <span>Nội dung hiệu quả nhất & Nguyên nhân</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed pl-3">
              {analysis.bestContentRationale}
            </p>
          </div>
        )}

        {/* 3. Problems & Improvements: Only render if entered */}
        {validIssues.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
              <span>Vấn đề & Điểm cần cải thiện</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 pl-3">
              {validIssues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-300">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 4. Next Week Plan: Only render if entered */}
        {validPlans.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              <span>Kế hoạch tuần tới</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 pl-3">
              {validPlans.map((plan, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-300">•</span>
                  <span>{plan}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 5. Recommendations: Only render if entered */}
      {validRecs.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-1.5">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            <span>Đề xuất & Kiến nghị với Ban Giám Đốc</span>
          </h4>
          <ul className="space-y-1 text-xs text-slate-600 pl-3">
            {validRecs.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 leading-relaxed">
                <span className="text-amber-500 font-bold">›</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

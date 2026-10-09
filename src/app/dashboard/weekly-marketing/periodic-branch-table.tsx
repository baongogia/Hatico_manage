import React from "react";
import { BranchResultRow } from "@/lib/periodic-marketing-types";

interface PeriodicBranchTableProps {
  branchResults: BranchResultRow[];
  totalSystem: BranchResultRow;
}

export function PeriodicBranchTable({
  branchResults,
  totalSystem,
}: PeriodicBranchTableProps) {
  const formatCost = (val: number) => `${val.toLocaleString("vi-VN")} ₫`;
  const formatNum = (val: number) => val.toLocaleString("vi-VN");

  return (
    <div className="overflow-x-auto border border-slate-200/90 rounded-[4px] bg-white shadow-2xs print:border-slate-300 print:shadow-none">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold">
            <th className="py-2.5 px-3">Chi nhánh</th>
            <th className="py-2.5 px-3 text-right">Nội dung đăng</th>
            <th className="py-2.5 px-3 text-right">Khách quan tâm</th>
            <th className="py-2.5 px-3 text-right">Đã tư vấn</th>
            <th className="py-2.5 px-3 text-right">Chuyển đổi</th>
            <th className="py-2.5 px-3 text-right">Đơn chốt</th>
            <th className="py-2.5 px-3 text-right">Chi phí Ads</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {branchResults.map((b) => (
            <tr key={b.branchId} className="hover:bg-slate-50/50">
              <td className="py-2.5 px-3 font-semibold text-slate-900">
                {b.branchName}
              </td>
              <td className="py-2.5 px-3 text-right font-medium">
                {formatNum(b.contentCount)}
              </td>
              <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                {formatNum(b.leads)}
              </td>
              <td className="py-2.5 px-3 text-right text-sky-700">
                {formatNum(b.consulted)}
              </td>
              <td className="py-2.5 px-3 text-right text-teal-700">
                {formatNum(b.converted)}
              </td>
              <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                {formatNum(b.orders)}
              </td>
              <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                {formatCost(b.adSpend)}
              </td>
            </tr>
          ))}

          {/* Row Tổng Toàn Hệ Thống */}
          <tr className="bg-slate-50/90 font-bold border-t-2 border-slate-200 text-slate-900">
            <td className="py-2.5 px-3 font-extrabold uppercase text-[11px] text-slate-800">
              Tổng toàn hệ thống
            </td>
            <td className="py-2.5 px-3 text-right font-bold">
              {formatNum(totalSystem.contentCount)}
            </td>
            <td className="py-2.5 px-3 text-right font-extrabold text-amber-800">
              {formatNum(totalSystem.leads)}
            </td>
            <td className="py-2.5 px-3 text-right font-bold text-sky-800">
              {formatNum(totalSystem.consulted)}
            </td>
            <td className="py-2.5 px-3 text-right font-bold text-teal-800">
              {formatNum(totalSystem.converted)}
            </td>
            <td className="py-2.5 px-3 text-right font-black text-emerald-800">
              {formatNum(totalSystem.orders)}
            </td>
            <td className="py-2.5 px-3 text-right font-extrabold text-rose-800">
              {formatCost(totalSystem.adSpend)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

import React from "react";
import { BranchResultRow } from "@/lib/periodic-marketing-types";

interface PeriodicBranchTableProps {
  branchResults: BranchResultRow[];
  totalSystem: BranchResultRow;
  isEditing?: boolean;
  onUpdateBranch?: (
    branchId: string,
    field: keyof BranchResultRow,
    value: number
  ) => void;
}

export function PeriodicBranchTable({
  branchResults,
  totalSystem,
  isEditing = false,
  onUpdateBranch,
}: PeriodicBranchTableProps) {
  const formatCost = (val: number | null | undefined) =>
    val === null || val === undefined ? "—" : `${val.toLocaleString("vi-VN")} ₫`;
  const formatNum = (val: number | null | undefined) =>
    val === null || val === undefined ? "—" : val.toLocaleString("vi-VN");

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
        <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
          {branchResults.map((b) => (
            <tr key={b.branchId} className="hover:bg-slate-50/50">
              <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                {b.branchName}
              </td>
              <td className="py-2.5 px-3 text-right">
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={b.contentCount}
                    onChange={(e) =>
                      onUpdateBranch?.(b.branchId, "contentCount", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-16 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono"
                  />
                ) : (
                  formatNum(b.contentCount)
                )}
              </td>
              <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={b.leads}
                    onChange={(e) =>
                      onUpdateBranch?.(b.branchId, "leads", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-16 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold"
                  />
                ) : (
                  formatNum(b.leads)
                )}
              </td>
              <td className="py-2.5 px-3 text-right text-slate-700">
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={b.consulted}
                    onChange={(e) =>
                      onUpdateBranch?.(b.branchId, "consulted", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-16 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono"
                  />
                ) : (
                  formatNum(b.consulted)
                )}
              </td>
              <td className="py-2.5 px-3 text-right text-slate-700">
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={b.converted}
                    onChange={(e) =>
                      onUpdateBranch?.(b.branchId, "converted", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-16 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono"
                  />
                ) : (
                  formatNum(b.converted)
                )}
              </td>
              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={b.orders}
                    onChange={(e) =>
                      onUpdateBranch?.(b.branchId, "orders", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-16 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold"
                  />
                ) : (
                  formatNum(b.orders)
                )}
              </td>
              <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={b.adSpend}
                    onChange={(e) =>
                      onUpdateBranch?.(b.branchId, "adSpend", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-24 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono"
                  />
                ) : (
                  formatCost(b.adSpend)
                )}
              </td>
            </tr>
          ))}

          {/* Row Tổng Toàn Hệ Thống */}
          <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-900">
            <td className="py-2.5 px-3 font-sans font-extrabold uppercase text-[11px] text-slate-900">
              Tổng toàn hệ thống
            </td>
            <td className="py-2.5 px-3 text-right font-bold">
              {formatNum(totalSystem.contentCount)}
            </td>
            <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
              {formatNum(totalSystem.leads)}
            </td>
            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
              {formatNum(totalSystem.consulted)}
            </td>
            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
              {formatNum(totalSystem.converted)}
            </td>
            <td className="py-2.5 px-3 text-right font-black text-slate-900">
              {formatNum(totalSystem.orders)}
            </td>
            <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
              {formatCost(totalSystem.adSpend)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

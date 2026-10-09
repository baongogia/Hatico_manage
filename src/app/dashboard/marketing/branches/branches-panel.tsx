"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  HATICO_BRANCHES,
  BranchPerformanceRow,
  MarketingFilter,
} from "@/lib/marketing-types";
import { getMarketingDashboardAction } from "@/app/actions-marketing";

export function BranchesPanel() {
  const [filter, setFilter] = useState<MarketingFilter>({
    dateRange: "this_month",
  });
  const [branchRows, setBranchRows] = useState<BranchPerformanceRow[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const loadData = () => {
    startTransition(async () => {
      const res = await getMarketingDashboardAction(filter);
      if (res.data) {
        setBranchRows(res.data.branchPerformance);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, [filter.dateRange]);

  const formatNumber = (num: number) => new Intl.NumberFormat("vi-VN").format(num);
  const formatMoney = (num: number) =>
    num > 0 ? new Intl.NumberFormat("vi-VN").format(num) + " đ" : "0 đ";

  const selectedBranchData = branchRows.find((b) => b.branchId === selectedBranchId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Báo cáo Marketing theo Chi nhánh</h2>
          <p className="text-xs text-slate-500">
            So sánh hiệu quả phân bổ khách hàng nguồn, khách tiếp nhận xử lý và chi phí Ads theo từng đơn vị
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          {(
            [
              { id: "today", label: "Hôm nay" },
              { id: "7days", label: "7 ngày qua" },
              { id: "this_month", label: "Tháng này" },
              { id: "last_month", label: "Tháng trước" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter({ ...filter, dateRange: t.id })}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filter.dateRange === t.id
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info notice about source vs handler branch */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5 leading-relaxed">
        <span className="text-blue-600 font-bold text-sm shrink-0">ℹ</span>
        <div>
          <strong className="font-semibold">Quy tắc ghi nhận chuẩn Hatico:</strong> Hệ thống phân biệt rõ{" "}
          <em>Khách nguồn</em> (do hoạt động Marketing/Fanpage của chi nhánh tạo ra) và{" "}
          <em>Khách tiếp nhận xử lý</em> (do phòng kinh doanh của chi nhánh trực tiếp gọi điện, tư vấn và chốt đơn)
          để đảm bảo đánh giá công bằng hiệu quả của từng bộ phận.
        </div>
      </div>

      {/* ================= BẢNG SO SÁNH 5 CHI NHÁNH ================= */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-2.5 px-3 min-w-[190px]">Chi nhánh</th>
                <th className="py-2.5 px-3 text-center">Nội dung đăng</th>
                <th className="py-2.5 px-3 text-center">Khách nguồn</th>
                <th className="py-2.5 px-3 text-center">Đã tư vấn</th>
                <th className="py-2.5 px-3 text-center">Chuyển đổi</th>
                <th className="py-2.5 px-3 text-center">Đơn chốt</th>
                <th className="py-2.5 px-3 text-right">Chi phí Ads</th>
                <th className="py-2.5 px-3 text-center bg-slate-100/70">Khách tiếp nhận</th>
                <th className="py-2.5 px-3 text-center bg-slate-100/70">Đơn tiếp nhận</th>
                <th className="py-2.5 px-3 text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchRows.map((row) => {
                const isSelected = selectedBranchId === row.branchId;
                return (
                  <tr
                    key={row.branchId}
                    onClick={() => setSelectedBranchId(isSelected ? null : row.branchId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5 font-semibold" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-primary" : "bg-slate-300"}`} />
                      <span>{row.branchName}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-slate-700">
                      {formatNumber(row.contentsCount)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-amber-600">
                      {formatNumber(row.leadsCount)}
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-sky-700">
                      {formatNumber(row.consultedCount)}
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-teal-700">
                      {formatNumber(row.convertedCount)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">
                      {formatNumber(row.ordersCount)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                      {formatMoney(row.adCost)}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-800 bg-slate-100/50">
                      {formatNumber(row.handledLeadsCount)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700 bg-slate-100/50">
                      {formatNumber(row.handledOrdersCount)}
                    </td>
                    <td className="py-3 px-3 text-center text-primary font-bold">
                      {isSelected ? "▲ Ẩn" : "▼ Xem"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= DRILL-DOWN CHI TIẾT CHI NHÁNH ĐƯỢC CHỌN ================= */}
      {selectedBranchData && (
        <div className="bg-white p-5 rounded-xl border border-primary/20 shadow-md space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Chi tiết kết quả hoạt động
              </span>
              <h3 className="text-base font-bold text-slate-900">{selectedBranchData.branchName}</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBranchId(null)}
              className="text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-md bg-slate-100 cursor-pointer"
            >
              Đóng chi tiết
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Bài đăng / Video</span>
              <p className="text-xl font-black text-slate-900 mt-1">{selectedBranchData.contentsCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Nội dung sản xuất</p>
            </div>

            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/70">
              <span className="text-[10px] text-amber-800 uppercase font-bold">Khách tạo nguồn</span>
              <p className="text-xl font-black text-amber-700 mt-1">{selectedBranchData.leadsCount}</p>
              <p className="text-[10px] text-amber-600 mt-0.5">Phát sinh từ kênh chi nhánh</p>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/70">
              <span className="text-[10px] text-emerald-800 uppercase font-bold">Đơn hàng chốt</span>
              <p className="text-xl font-black text-emerald-700 mt-1">{selectedBranchData.ordersCount}</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Từ nguồn Marketing chi nhánh</p>
            </div>

            <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200/70">
              <span className="text-[10px] text-rose-800 uppercase font-bold">Chi phí Ads</span>
              <p className="text-base font-black text-rose-700 mt-1">{formatMoney(selectedBranchData.adCost)}</p>
              <p className="text-[10px] text-rose-500 mt-0.5">Chiến dịch dành riêng chi nhánh</p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-semibold text-slate-800">
                Năng lực xử lý khách hàng tại {selectedBranchData.branchName}:
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Chi nhánh đã tiếp nhận chăm sóc {selectedBranchData.handledLeadsCount} khách hàng và hoàn tất chốt{" "}
                {selectedBranchData.handledOrdersCount} đơn hàng.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-primary">
                Tỷ lệ chốt đơn tiếp nhận:{" "}
                {selectedBranchData.handledLeadsCount > 0
                  ? `${((selectedBranchData.handledOrdersCount / selectedBranchData.handledLeadsCount) * 100).toFixed(1)}%`
                  : "0%"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

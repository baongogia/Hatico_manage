"use client";

import { useState } from "react";
import type { WorkReportData, WorkReportStaffItem } from "@/app/actions";
import { calculateWorkReportTotals } from "@/lib/report-data";
import { formatCallOutcomeVi, formatTaskStatusVi } from "@/lib/work-report-export";
import { CustomDatePicker } from "@/components/ui/custom-datepicker";

interface WorkExcelPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (exportConfig: {
    startDate: string;
    endDate: string;
    staffIds: string[];
    includeDetails: boolean;
  }) => void;
  currentStaff: WorkReportStaffItem;
  availableStaff: WorkReportStaffItem[];
  canSelectMultiple: boolean;
  currentDate: string;
  currentReport: WorkReportData;
  isExporting?: boolean;
}

export function WorkExcelPreviewModal({
  open,
  onClose,
  onConfirm,
  currentStaff,
  availableStaff,
  canSelectMultiple,
  currentDate,
  currentReport,
  isExporting = false,
}: WorkExcelPreviewModalProps) {
  const [rangeMode, setRangeMode] = useState<"single" | "range">("single");
  const [startDate, setStartDate] = useState(currentDate);
  const [endDate, setEndDate] = useState(currentDate);
  const [exportScope, setExportScope] = useState<"current" | "all">("current");
  const [includeDetails, setIncludeDetails] = useState(false);

  if (!open) return null;

  const effectiveStartDate = rangeMode === "single" ? currentDate : startDate;
  const effectiveEndDate = rangeMode === "single" ? currentDate : endDate;
  const effectiveStaffIds =
    exportScope === "all" && canSelectMultiple
      ? availableStaff.map((s) => s.id)
      : [currentStaff.id];

  const totals = calculateWorkReportTotals({
    calls: currentReport.calls,
    posts: currentReport.posts,
    otherTasks: currentReport.otherTasks,
    visits: currentReport.visits,
    summary: {
      type: "daily_summary",
      summary: currentReport.dailySummary,
      closed_orders: currentReport.closedOrders,
    },
  });

  const handleExportClick = () => {
    onConfirm({
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      staffIds: effectiveStaffIds,
      includeDetails,
    });
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5 no-print animate-in fade-in duration-150">
      <div className="bg-white border border-[#E4E7EC] shadow-xl rounded-lg p-4 sm:p-6 max-w-4xl w-full flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC] shrink-0">
          <div>
            <h3 className="font-bold text-[#17365D] text-base">Xuất báo cáo công việc ra Excel</h3>
            <p className="text-[#667085] text-xs mt-0.5">
              File .xlsx định dạng tinh gọn, chuyên nghiệp theo nhận diện HATICO
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#667085] hover:text-[#202936] p-1.5 rounded-md hover:bg-[#F2F4F7] transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Options Controls */}
        <div className="py-3 border-b border-[#E4E7EC] grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0 text-xs text-[#344054] bg-[#F7F8FA] -mx-4 sm:-mx-6 px-4 sm:px-6">
          {/* Option 1: Thời gian */}
          <div className="space-y-1.5">
            <span className="font-medium text-[#202936] block text-xs">
              Thời gian xuất
            </span>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="rangeMode"
                  checked={rangeMode === "single"}
                  onChange={() => setRangeMode("single")}
                  className="text-[#17365D] focus:ring-[#17365D]"
                />
                <span>Ngày hiện tại ({formatDateDisplay(currentDate)})</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="rangeMode"
                  checked={rangeMode === "range"}
                  onChange={() => setRangeMode("range")}
                  className="text-[#17365D] focus:ring-[#17365D]"
                />
                <span>Khoảng ngày</span>
              </label>
            </div>
            {rangeMode === "range" && (
              <div className="flex items-center gap-2 pt-1">
                <CustomDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  size="sm"
                  portal={true}
                />
                <span className="text-xs text-[#667085]">đến</span>
                <CustomDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  size="sm"
                  portal={true}
                />
              </div>
            )}
          </div>

          {/* Option 2: Nhân viên (nếu có quyền) */}
          <div className="space-y-1.5">
            <span className="font-medium text-[#202936] block text-xs">
              Phạm vi nhân viên
            </span>
            {canSelectMultiple ? (
              <div className="space-y-1">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="exportScope"
                    checked={exportScope === "current"}
                    onChange={() => setExportScope("current")}
                    className="text-[#17365D] focus:ring-[#17365D]"
                  />
                  <span>Chỉ nhân viên đang chọn ({currentStaff.full_name})</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="exportScope"
                    checked={exportScope === "all"}
                    onChange={() => setExportScope("all")}
                    className="text-[#17365D] focus:ring-[#17365D]"
                  />
                  <span>Tất cả {availableStaff.length} nhân viên (đóng gói file .ZIP)</span>
                </label>
              </div>
            ) : (
              <div className="text-[#202936] font-medium pt-1">
                {currentStaff.full_name} ({currentStaff.branch_name})
              </div>
            )}
          </div>

          {/* Option 3: Chi tiết */}
          <div className="space-y-1.5">
            <span className="font-medium text-[#202936] block text-xs">
              Tùy chọn trang
            </span>
            <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={includeDetails}
                onChange={(e) => setIncludeDetails(e.target.checked)}
                className="rounded border-[#E4E7EC] text-[#17365D] focus:ring-[#17365D]"
              />
              <div>
                <span className="font-medium text-[#202936]">Kèm chi tiết (Sheet phụ)</span>
                <p className="text-[11px] text-[#667085]">
                  Bảng chi tiết từng cuộc gọi, link bài đăng, thị trường và công việc
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Modal Body / Visual Sheet Preview */}
        <div className="flex-grow overflow-auto py-3 min-h-0">
          <div className="text-[#667085] text-xs mb-2 flex items-center justify-between">
            <span>Bản xem trước bố cục Sheet chính: &ldquo;Báo cáo công việc&rdquo;</span>
            <span className="text-[11px] bg-[#F2F4F7] text-[#344054] px-2 py-0.5 rounded">
              Chuẩn in ấn A4
            </span>
          </div>

          <div className="border border-[#E4E7EC] rounded-md overflow-auto bg-[#F7F8FA] p-3 sm:p-4 min-w-[700px] max-h-[48vh] no-scrollbar">
            <div className="bg-white border border-[#E4E7EC] shadow-xs font-sans text-xs text-[#202936] p-4 space-y-4 rounded">
              {/* Header */}
              <div className="border-b border-[#E4E7EC] pb-2">
                <div className="text-[11px] font-semibold text-[#667085]">
                  CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO
                </div>
                <div className="text-base font-bold text-[#17365D] mt-0.5">
                  BÁO CÁO CÔNG VIỆC
                </div>
                <div className="text-[11px] text-[#667085] italic mt-0.5">
                  Nhân viên: <strong className="text-[#202936] not-italic">{currentStaff.full_name}</strong> · Chi nhánh: {currentStaff.branch_name} · Kỳ báo cáo: {rangeMode === "single" ? formatDateDisplay(currentDate) : `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`}
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-4 gap-2 bg-[#F7F8FA] p-2.5 rounded border border-[#E4E7EC] text-center">
                <div>
                  <div className="text-[11px] font-medium text-[#667085]">Khách liên hệ</div>
                  <div className="text-sm font-semibold text-[#17365D] mt-0.5">{totals.customerContacts} cuộc</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-[#667085]">Bài đăng</div>
                  <div className="text-sm font-semibold text-[#17365D] mt-0.5">{totals.postsCount} bài</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-[#667085]">Việc hoàn thành</div>
                  <div className="text-sm font-semibold text-[#17365D] mt-0.5">{totals.completedTasks} việc</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-[#667085]">Khách gặp (thị trường)</div>
                  <div className="text-sm font-semibold text-[#17365D] mt-0.5">
                    {totals.customersVisited} khách ({totals.visitTrips} lượt)
                  </div>
                </div>
              </div>

              {totals.closedOrders > 0 && (
                <div className="bg-[#ECFDF3] border border-[#ABEFC6] text-[#027A48] px-3 py-1.5 rounded text-xs font-semibold flex items-center justify-between">
                  <span>Đơn chốt / cọc trong kỳ: {totals.closedOrders} đơn</span>
                  {currentReport.contractValue && (
                    <span>Giá trị: {currentReport.contractValue}</span>
                  )}
                </div>
              )}

              {/* Activity Summary Table */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#17365D]">
                  Tổng hợp hoạt động
                </div>
                <table className="w-full border-collapse border border-[#E4E7EC] text-left text-xs">
                  <thead>
                    <tr className="bg-[#17365D] text-white">
                      <th className="p-2 border border-[#E4E7EC] w-[25%] font-medium">Nhóm công việc</th>
                      <th className="p-2 border border-[#E4E7EC] w-[15%] font-medium text-center">Số lượng</th>
                      <th className="p-2 border border-[#E4E7EC] w-[40%] font-medium">Kết quả chính</th>
                      <th className="p-2 border border-[#E4E7EC] w-[20%] font-medium">Hành động tiếp</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#E4E7EC]">
                      <td className="p-2 border border-[#E4E7EC] font-medium">Gọi / chăm sóc khách</td>
                      <td className="p-2 border border-[#E4E7EC] text-center font-semibold text-[#17365D]">{totals.customerContacts} cuộc</td>
                      <td className="p-2 border border-[#E4E7EC] text-[#344054] text-[11px]">
                        {currentReport.calls.length > 0
                          ? currentReport.calls.map((c) => `${c.customer_name || c.phone} (${formatCallOutcomeVi(c.result)})`).slice(0, 3).join("; ") + (currentReport.calls.length > 3 ? "..." : "")
                          : "Chưa có cuộc gọi"}
                      </td>
                      <td className="p-2 border border-[#E4E7EC] text-[#667085] text-[11px]">
                        {currentReport.calls.some((c) => c.follow_up_date) ? "Có lịch hẹn liên hệ lại" : "Theo dõi tiếp"}
                      </td>
                    </tr>
                    <tr className="border-b border-[#E4E7EC] bg-[#F7F8FA]">
                      <td className="p-2 border border-[#E4E7EC] font-medium">Đăng bài bán hàng</td>
                      <td className="p-2 border border-[#E4E7EC] text-center font-semibold text-[#17365D]">{totals.postsCount} bài</td>
                      <td className="p-2 border border-[#E4E7EC] text-[#344054] text-[11px]">
                        {currentReport.posts.length > 0
                          ? currentReport.posts.map((p) => `${p.platform} (${p.quantity} bài)`).join(", ")
                          : "Không có bài đăng"}
                      </td>
                      <td className="p-2 border border-[#E4E7EC] text-[#667085] text-[11px]">Duy trì lịch đăng</td>
                    </tr>
                    <tr className="border-b border-[#E4E7EC]">
                      <td className="p-2 border border-[#E4E7EC] font-medium">Đi thị trường</td>
                      <td className="p-2 border border-[#E4E7EC] text-center font-semibold text-[#17365D]">
                        {totals.customersVisited} khách ({totals.visitTrips} lượt)
                      </td>
                      <td className="p-2 border border-[#E4E7EC] text-[#344054] text-[11px]">
                        {currentReport.visits.length > 0
                          ? currentReport.visits.map((v) => `${v.location_customer}: ${v.outcome}`).join("; ")
                          : "Không có lượt đi"}
                      </td>
                      <td className="p-2 border border-[#E4E7EC] text-[#667085] text-[11px]">
                        {currentReport.visits.find((v) => v.next_action)?.next_action || "—"}
                      </td>
                    </tr>
                    <tr className="bg-[#F7F8FA]">
                      <td className="p-2 border border-[#E4E7EC] font-medium">Công việc khác</td>
                      <td className="p-2 border border-[#E4E7EC] text-center font-semibold text-[#17365D]">{currentReport.otherTasks.length} việc</td>
                      <td className="p-2 border border-[#E4E7EC] text-[#344054] text-[11px]">
                        {currentReport.otherTasks.length > 0
                          ? currentReport.otherTasks.map((t) => `${t.task_name} (${formatTaskStatusVi(t.status)})`).join("; ")
                          : "Không có"}
                      </td>
                      <td className="p-2 border border-[#E4E7EC] text-[#667085] text-[11px]">
                        {currentReport.otherTasks.some((t) => t.status !== "completed") ? "Hoàn thiện tồn đọng" : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary note if present */}
              {currentReport.dailySummary && (
                <div className="bg-[#F7F8FA] border border-[#E4E7EC] p-2.5 rounded text-[11px] text-[#344054] italic">
                  <div className="font-semibold text-[#202936] not-italic mb-1 text-xs">
                    Tổng kết & kế hoạch tiếp theo:
                  </div>
                  {currentReport.dailySummary}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E4E7EC] shrink-0">
          <div className="text-xs text-[#667085]">
            {exportScope === "all" ? (
              <span>Đang chọn xuất cho <strong>{availableStaff.length}</strong> nhân viên (.ZIP)</span>
            ) : (
              <span>Tên file: <code className="text-[#202936] font-mono text-[11px]">Bao_cao_cong_viec_{currentStaff.full_name.replace(/\s+/g, "_")}.xlsx</code></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="h-9 px-3.5 text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7] rounded-md transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleExportClick}
              disabled={isExporting}
              className="h-9 inline-flex items-center gap-2 px-4 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#112B4B] rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Đang tạo file...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>
                    {exportScope === "all" ? "Tải gói ZIP toàn bộ nhân viên" : "Tải file Excel (.xlsx)"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

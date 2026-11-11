import ExcelJS from "exceljs";
import JSZip from "jszip";
import type { WorkReportData } from "@/app/actions";
import { calculateWorkReportTotals } from "@/lib/report-data";

const PRIMARY = "FF0F2D59";
const NAVY_LIGHT = "FF1E3A8A";
const BORDER_COLOR = "FFCBD5E1";
const HEADER_FILL = "FF0F2D59";
const ALT_FILL = "FFF8FAFC";
const KPI_BG = "FFF1F5F9";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
};

function styleRow(row: ExcelJS.Row, style: Partial<ExcelJS.Style>) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.style = { ...cell.style, ...style };
  });
}

function sanitizeText(val?: string | number | null): string {
  if (val == null) return "";
  const s = String(val).trim();
  if (s.startsWith("=") || s.startsWith("+") || s.startsWith("-") || s.startsWith("@")) {
    return "'" + s;
  }
  return s;
}

function formatDateVi(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoDate;
}

export function formatCallOutcomeVi(outcome?: string): string {
  if (!outcome) return "—";
  switch (outcome) {
    case "no_answer":
      return "Không nghe máy";
    case "follow_up":
      return "Cần theo dõi";
    case "interested":
      return "Quan tâm";
    case "quote_sent":
      return "Đã báo giá";
    case "closed":
      return "Chốt đơn / cọc";
    default:
      return outcome;
  }
}

export function formatTaskStatusVi(status?: string): string {
  switch (status) {
    case "completed":
      return "Hoàn thành";
    case "in_progress":
      return "Đang làm";
    case "pending":
      return "Chờ xử lý";
    default:
      return status || "Hoàn thành";
  }
}

export interface WorkReportExportOptions {
  staffName: string;
  branchName?: string;
  departmentName?: string;
  startDate: string;
  endDate: string;
  dailyReports: WorkReportData[];
  includeDetails?: boolean;
}

/**
 * Builds an ExcelJS Workbook for a single staff member across one or multiple days.
 */
export async function buildStaffWorkReportWorkbook(
  options: WorkReportExportOptions
): Promise<ExcelJS.Workbook> {
  const {
    staffName,
    branchName = "Hatico",
    startDate,
    endDate,
    dailyReports,
    includeDetails = false,
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hatico Manager";

  // Aggregate totals across all daily reports
  const allCalls = dailyReports.flatMap((r) => r.calls || []);
  const allPosts = dailyReports.flatMap((r) => r.posts || []);
  const allOther = dailyReports.flatMap((r) => r.otherTasks || []);
  const allVisits = dailyReports.flatMap((r) => r.visits || []);
  const allSummaries = dailyReports
    .map((r) => ({
      date: r.date,
      summary: r.dailySummary,
      closed_orders: r.closedOrders,
      contract_value: r.contractValue,
    }))
    .filter((s) => s.summary || s.closed_orders || s.contract_value);

  const totals = calculateWorkReportTotals({
    calls: allCalls,
    posts: allPosts,
    otherTasks: allOther,
    visits: allVisits,
    summary: {
      type: "daily_summary",
      summary: "",
      closed_orders: dailyReports.reduce((sum, r) => sum + (r.closedOrders || 0), 0),
    },
  });

  const isSingleDay = startDate === endDate;
  const periodLabel = isSingleDay
    ? `Ngày ${formatDateVi(startDate)}`
    : `Kỳ: ${formatDateVi(startDate)} - ${formatDateVi(endDate)} (${dailyReports.length} ngày)`;

  // ==========================================
  // SHEET 1: BÁO CÁO CÔNG VIỆC (MAIN SUMMARY)
  // ==========================================
  const mainSheet = workbook.addWorksheet("Báo cáo công việc", {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  mainSheet.columns = [
    { key: "colA", width: 26 },
    { key: "colB", width: 14 },
    { key: "colC", width: 38 },
    { key: "colD", width: 22 },
  ];

  // Title Block
  const titleRow = mainSheet.addRow(["CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO", "", "", ""]);
  mainSheet.mergeCells(`A${titleRow.number}:D${titleRow.number}`);
  styleRow(titleRow, {
    font: { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF475569" } },
    alignment: { vertical: "middle", horizontal: "left" },
  });
  titleRow.height = 20;

  const headerRow = mainSheet.addRow(["BÁO CÁO CÔNG VIỆC", "", "", ""]);
  mainSheet.mergeCells(`A${headerRow.number}:D${headerRow.number}`);
  styleRow(headerRow, {
    font: { name: "Segoe UI", size: 15, bold: true, color: { argb: PRIMARY } },
    alignment: { vertical: "middle", horizontal: "left" },
  });
  headerRow.height = 28;

  const metaRow = mainSheet.addRow([
    `Nhân viên: ${staffName}   ·   Chi nhánh: ${branchName}   ·   ${periodLabel}`,
    "",
    "",
    "",
  ]);
  mainSheet.mergeCells(`A${metaRow.number}:D${metaRow.number}`);
  styleRow(metaRow, {
    font: { name: "Segoe UI", size: 10, color: { argb: "FF334155" }, italic: true },
    alignment: { vertical: "middle", horizontal: "left" },
  });
  metaRow.height = 20;

  mainSheet.addRow([]); // Blank spacer

  // Compact KPI Strip
  const kpiHeaderRow = mainSheet.addRow([
    "KHÁCH LIÊN HỆ",
    "BÀI ĐĂNG",
    "VIỆC HOÀN THÀNH",
    "KHÁCH GẶP (THỊ TRƯỜNG)",
  ]);
  styleRow(kpiHeaderRow, {
    font: { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF475569" } },
    alignment: { vertical: "middle", horizontal: "center" },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: KPI_BG } },
    border: thinBorder,
  });
  kpiHeaderRow.height = 22;

  const kpiValueRow = mainSheet.addRow([
    `${totals.customerContacts} cuộc/khách`,
    `${totals.postsCount} bài`,
    `${totals.completedTasks} việc`,
    `${totals.customersVisited} khách (${totals.visitTrips} lượt đi)`,
  ]);
  styleRow(kpiValueRow, {
    font: { name: "Segoe UI", size: 13, bold: true, color: { argb: PRIMARY } },
    alignment: { vertical: "middle", horizontal: "center" },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } },
    border: thinBorder,
  });
  kpiValueRow.height = 28;

  if (totals.closedOrders > 0) {
    const closedRow = mainSheet.addRow([
      `ĐƠN CHỐT / CỌC: ${totals.closedOrders} đơn`,
      "",
      "",
      "",
    ]);
    mainSheet.mergeCells(`A${closedRow.number}:D${closedRow.number}`);
    styleRow(closedRow, {
      font: { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF047857" } },
      alignment: { vertical: "middle", horizontal: "center" },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } },
      border: thinBorder,
    });
    closedRow.height = 24;
  }

  mainSheet.addRow([]); // Blank spacer

  // Activity Group Summary Table
  const tableTitle = mainSheet.addRow(["TỔNG HỢP HOẠT ĐỘNG", "", "", ""]);
  mainSheet.mergeCells(`A${tableTitle.number}:D${tableTitle.number}`);
  styleRow(tableTitle, {
    font: { name: "Segoe UI", size: 11, bold: true, color: { argb: NAVY_LIGHT } },
  });
  tableTitle.height = 22;

  const actHeader = mainSheet.addRow([
    "Nhóm công việc",
    "Số lượng",
    "Kết quả chính / Nội dung nổi bật",
    "Hành động tiếp theo",
  ]);
  styleRow(actHeader, {
    font: { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
    alignment: { vertical: "middle", horizontal: "center" },
    border: thinBorder,
  });
  actHeader.height = 26;

  // Row 1: Gọi / chăm sóc khách hàng
  const callOutcomesCount: Record<string, number> = {};
  const notableCalls: string[] = [];
  const followUpCalls: string[] = [];

  for (const c of allCalls) {
    const outcome = formatCallOutcomeVi(c.result);
    callOutcomesCount[outcome] = (callOutcomesCount[outcome] || 0) + 1;
    if (c.result === "closed" || c.result === "quote_sent" || c.result === "interested") {
      const parts = [c.customer_name || c.phone];
      if (c.trailer_type) parts.push(`loại ${c.trailer_type}`);
      if (c.price_quote) parts.push(`báo ${c.price_quote}`);
      if (c.result === "closed") parts.push("CHỐT/CỌC");
      notableCalls.push(parts.join(" - "));
    }
    if (c.follow_up_date) {
      followUpCalls.push(`${c.customer_name || c.phone}: hẹn ${formatDateVi(c.follow_up_date)}`);
    }
  }

  const callOutcomeSummary = Object.entries(callOutcomesCount)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");

  const callDetailsSummary = notableCalls.length > 0
    ? `${callOutcomeSummary}\nKhách tiêu biểu: ${notableCalls.slice(0, 5).join("; ")}${notableCalls.length > 5 ? "..." : ""}`
    : callOutcomeSummary || "Chưa có cuộc gọi";

  const callNextAction = followUpCalls.length > 0
    ? followUpCalls.slice(0, 4).join("\n")
    : allCalls.some((c) => c.result === "follow_up")
    ? "Theo dõi và liên hệ lại"
    : "—";

  const rowCalls = mainSheet.addRow([
    "Gọi / chăm sóc khách",
    `${totals.customerContacts} cuộc`,
    sanitizeText(callDetailsSummary),
    sanitizeText(callNextAction),
  ]);
  styleRow(rowCalls, {
    font: { name: "Segoe UI", size: 9.5 },
    alignment: { vertical: "top", wrapText: true },
    border: thinBorder,
  });

  // Row 2: Đăng bài bán hàng
  const platformsMap: Record<string, number> = {};
  let totalInquiries = 0;
  for (const p of allPosts) {
    platformsMap[p.platform] = (platformsMap[p.platform] || 0) + (p.quantity || 1);
    if (p.inquiries_count) totalInquiries += p.inquiries_count;
  }
  const postPlatformSummary = Object.entries(platformsMap)
    .map(([plat, count]) => `${plat}: ${count} bài`)
    .join(", ");

  const postDesc = postPlatformSummary
    ? `${postPlatformSummary}${totalInquiries > 0 ? ` (Phát sinh ${totalInquiries} khách inbox/hỏi)` : ""}`
    : "Không có bài đăng";

  const rowPosts = mainSheet.addRow([
    "Đăng bài truyền thông",
    `${totals.postsCount} bài`,
    sanitizeText(postDesc),
    totalInquiries > 0 ? "Chăm sóc khách hỏi từ bài đăng" : "Duy trì lịch đăng bài",
  ]);
  styleRow(rowPosts, {
    font: { name: "Segoe UI", size: 9.5 },
    alignment: { vertical: "top", wrapText: true },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } },
    border: thinBorder,
  });

  // Row 3: Đi thị trường
  const visitOutcomes: string[] = [];
  const visitNext: string[] = [];
  for (const v of allVisits) {
    if (v.location_customer) {
      visitOutcomes.push(`${v.location_customer}: ${v.outcome || "Đã gặp"}`);
    }
    if (v.next_action) {
      visitNext.push(v.next_action);
    }
  }

  const rowVisits = mainSheet.addRow([
    "Đi thị trường / Gặp khách",
    `${totals.customersVisited} khách (${totals.visitTrips} lượt)`,
    sanitizeText(visitOutcomes.join("\n") || "Không có hoạt động thị trường"),
    sanitizeText(visitNext.join("\n") || "—"),
  ]);
  styleRow(rowVisits, {
    font: { name: "Segoe UI", size: 9.5 },
    alignment: { vertical: "top", wrapText: true },
    border: thinBorder,
  });

  // Row 4: Công việc khác
  const completedTaskNames = allOther.map((t) => {
    const status = formatTaskStatusVi(t.status);
    return `${t.task_name} (${status}${t.result_obstacle ? ` - ${t.result_obstacle}` : ""})`;
  });

  const rowOther = mainSheet.addRow([
    "Công việc khác",
    `${allOther.length} việc`,
    sanitizeText(completedTaskNames.join("\n") || "Không có việc khác"),
    allOther.some((t) => t.status !== "completed") ? "Hoàn thiện các việc tồn đọng" : "—",
  ]);
  styleRow(rowOther, {
    font: { name: "Segoe UI", size: 9.5 },
    alignment: { vertical: "top", wrapText: true },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } },
    border: thinBorder,
  });

  mainSheet.addRow([]); // Blank spacer

  // Daily Summary Section (if provided)
  const summariesWithText = allSummaries.filter((s) => s.summary && s.summary.trim());
  if (summariesWithText.length > 0 || totals.closedOrders > 0) {
    const sumTitle = mainSheet.addRow(["TỔNG KẾT, VƯỚNG MẮC & KẾ HOẠCH TIẾP THEO", "", "", ""]);
    mainSheet.mergeCells(`A${sumTitle.number}:D${sumTitle.number}`);
    styleRow(sumTitle, {
      font: { name: "Segoe UI", size: 11, bold: true, color: { argb: NAVY_LIGHT } },
    });
    sumTitle.height = 22;

    for (const item of allSummaries) {
      if (!item.summary && !item.closed_orders && !item.contract_value) continue;
      const prefix = isSingleDay ? "" : `[${formatDateVi(item.date)}] `;
      const summaryContent = [
        item.summary ? `${prefix}${item.summary}` : "",
        item.closed_orders ? `• Chốt đơn: ${item.closed_orders} xe` : "",
        item.contract_value ? `• Giá trị: ${item.contract_value}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const sumRow = mainSheet.addRow([summaryContent, "", "", ""]);
      mainSheet.mergeCells(`A${sumRow.number}:D${sumRow.number}`);
      styleRow(sumRow, {
        font: { name: "Segoe UI", size: 10, italic: true },
        alignment: { vertical: "top", wrapText: true },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } },
        border: thinBorder,
      });
      sumRow.height = Math.max(26, summaryContent.split("\n").length * 18);
    }

    mainSheet.addRow([]);
  }

  // Multi-day breakdown table (if multiple days)
  if (!isSingleDay && dailyReports.length > 1) {
    const breakTitle = mainSheet.addRow(["DIỄN BIẾN THEO TỪNG NGÀY", "", "", ""]);
    mainSheet.mergeCells(`A${breakTitle.number}:D${breakTitle.number}`);
    styleRow(breakTitle, {
      font: { name: "Segoe UI", size: 11, bold: true, color: { argb: NAVY_LIGHT } },
    });

    const breakHeader = mainSheet.addRow([
      "Ngày",
      "Khách liên hệ",
      "Bài đăng",
      "Đi thị trường / Việc hoàn thành",
    ]);
    styleRow(breakHeader, {
      font: { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
      alignment: { vertical: "middle", horizontal: "center" },
      border: thinBorder,
    });

    for (const rep of dailyReports) {
      const dTotals = calculateWorkReportTotals({
        calls: rep.calls,
        posts: rep.posts,
        otherTasks: rep.otherTasks,
        visits: rep.visits,
        summary: {
          type: "daily_summary",
          summary: "",
          closed_orders: rep.closedOrders,
        },
      });

      const daySummaryNotes = [
        dTotals.customersVisited > 0 ? `${dTotals.customersVisited} khách thị trường` : "",
        dTotals.completedTasks > 0 ? `${dTotals.completedTasks} việc xong` : "",
        dTotals.closedOrders > 0 ? `Chốt ${dTotals.closedOrders} đơn` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const dayRow = mainSheet.addRow([
        formatDateVi(rep.date),
        `${dTotals.customerContacts} cuộc`,
        `${dTotals.postsCount} bài`,
        daySummaryNotes || "Bình thường",
      ]);
      styleRow(dayRow, {
        font: { name: "Segoe UI", size: 9 },
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder,
      });
    }
  }

  // Signatures block
  mainSheet.addRow([]);
  mainSheet.addRow([]);
  const signRow = mainSheet.addRow(["Người lập báo cáo", "", "", "Quản lý / Phụ trách duyệt"]);
  mainSheet.mergeCells(`A${signRow.number}:B${signRow.number}`);
  mainSheet.mergeCells(`C${signRow.number}:D${signRow.number}`);
  styleRow(signRow, {
    font: { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF334155" } },
    alignment: { horizontal: "center" },
  });

  const signSpace = mainSheet.addRow(["(Ký & ghi rõ họ tên)", "", "", "(Ký & ghi rõ họ tên)"]);
  mainSpaceMerged: {
    mainSheet.mergeCells(`A${signSpace.number}:B${signSpace.number}`);
    mainSheet.mergeCells(`C${signSpace.number}:D${signSpace.number}`);
    styleRow(signSpace, {
      font: { name: "Segoe UI", size: 8.5, italic: true, color: { argb: "FF64748B" } },
      alignment: { horizontal: "center" },
    });
  }

  const signName = mainSheet.addRow([staffName, "", "", ""]);
  mainSheet.mergeCells(`A${signName.number}:B${signName.number}`);
  styleRow(signName, {
    font: { name: "Segoe UI", size: 10, bold: true },
    alignment: { horizontal: "center" },
  });
  signName.height = 36;

  // ==========================================
  // SHEET 2: CHI TIẾT CÔNG VIỆC (OPTIONAL)
  // ==========================================
  if (includeDetails) {
    const detailSheet = workbook.addWorksheet("Chi tiết công việc", {
      views: [{ showGridLines: true }],
    });

    detailSheet.columns = [
      { key: "c1", width: 8 },
      { key: "c2", width: 22 },
      { key: "c3", width: 16 },
      { key: "c4", width: 16 },
      { key: "c5", width: 16 },
      { key: "c6", width: 16 },
      { key: "c7", width: 18 },
      { key: "c8", width: 34 },
      { key: "c9", width: 16 },
    ];

    // SECTION A: CHI TIẾT GỌI / CHĂM KHÁCH
    if (allCalls.length > 0) {
      const dCallsTitle = detailSheet.addRow(["1. CHI TIẾT GỌI & CHĂM SÓC KHÁCH HÀNG", "", "", "", "", "", "", "", ""]);
      detailSheet.mergeCells(`A${dCallsTitle.number}:I${dCallsTitle.number}`);
      styleRow(dCallsTitle, {
        font: { name: "Segoe UI", size: 11, bold: true, color: { argb: PRIMARY } },
      });

      const dCallH = detailSheet.addRow([
        "STT",
        "Khách hàng",
        "Điện thoại",
        "Tỉnh thành",
        "Sản phẩm",
        "Giá báo",
        "Kết quả",
        "Ghi chú",
        "Hẹn liên hệ lại",
      ]);
      styleRow(dCallH, {
        font: { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder,
      });

      allCalls.forEach((c, idx) => {
        const row = detailSheet.addRow([
          idx + 1,
          sanitizeText(c.customer_name),
          sanitizeText(c.phone),
          sanitizeText(c.province),
          sanitizeText(c.trailer_type),
          sanitizeText(c.price_quote),
          formatCallOutcomeVi(c.result),
          sanitizeText(c.post_call_notes),
          formatDateVi(c.follow_up_date || ""),
        ]);
        styleRow(row, {
          font: { name: "Segoe UI", size: 9 },
          alignment: { vertical: "middle", wrapText: true },
          border: thinBorder,
          fill: idx % 2 === 1 ? { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } } : undefined,
        });
      });

      detailSheet.addRow([]);
      detailSheet.addRow([]);
    }

    // SECTION B: CHI TIẾT ĐĂNG BÀI
    if (allPosts.length > 0) {
      const dPostTitle = detailSheet.addRow(["2. CHI TIẾT BÀI ĐĂNG BÁN HÀNG", "", "", "", "", "", "", "", ""]);
      detailSheet.mergeCells(`A${dPostTitle.number}:I${dPostTitle.number}`);
      styleRow(dPostTitle, {
        font: { name: "Segoe UI", size: 11, bold: true, color: { argb: PRIMARY } },
      });

      const dPostH = detailSheet.addRow([
        "STT",
        "Nền tảng",
        "Số bài",
        "Khách inbox",
        "Link / Mô tả nội dung",
        "Link bổ sung",
        "",
        "",
        "",
      ]);
      detailSheet.mergeCells(`E${dPostH.number}:I${dPostH.number}`);
      styleRow(dPostH, {
        font: { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder,
      });

      allPosts.forEach((p, idx) => {
        const row = detailSheet.addRow([
          idx + 1,
          sanitizeText(p.platform),
          p.quantity || 1,
          p.inquiries_count || "—",
          sanitizeText(p.link_or_desc || "—"),
          sanitizeText(p.additional_links || ""),
          "",
          "",
          "",
        ]);
        detailSheet.mergeCells(`E${row.number}:I${row.number}`);
        styleRow(row, {
          font: { name: "Segoe UI", size: 9 },
          alignment: { vertical: "middle", wrapText: true },
          border: thinBorder,
          fill: idx % 2 === 1 ? { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } } : undefined,
        });
      });

      detailSheet.addRow([]);
      detailSheet.addRow([]);
    }

    // SECTION C: CHI TIẾT ĐI THỊ TRƯỜNG
    if (allVisits.length > 0) {
      const dVisitTitle = detailSheet.addRow(["3. CHI TIẾT ĐI THỊ TRƯỜNG / GẶP KHÁCH", "", "", "", "", "", "", "", ""]);
      detailSheet.mergeCells(`A${dVisitTitle.number}:I${dVisitTitle.number}`);
      styleRow(dVisitTitle, {
        font: { name: "Segoe UI", size: 11, bold: true, color: { argb: PRIMARY } },
      });

      const dVisitH = detailSheet.addRow([
        "STT",
        "Khu vực / Khách gặp",
        "Số khách",
        "Kết quả tóm tắt",
        "Hành động tiếp theo",
        "Chi phí",
        "",
        "",
        "",
      ]);
      detailSheet.mergeCells(`D${dVisitH.number}:E${dVisitH.number}`);
      detailSheet.mergeCells(`F${dVisitH.number}:I${dVisitH.number}`);
      styleRow(dVisitH, {
        font: { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder,
      });

      allVisits.forEach((v, idx) => {
        const row = detailSheet.addRow([
          idx + 1,
          sanitizeText(v.location_customer),
          v.customers_visited_count || 1,
          sanitizeText(v.outcome),
          "",
          sanitizeText(v.next_action || "—"),
          sanitizeText(v.expenses || "—"),
          "",
          "",
        ]);
        detailSheet.mergeCells(`D${row.number}:E${row.number}`);
        detailSheet.mergeCells(`F${row.number}:I${row.number}`);
        styleRow(row, {
          font: { name: "Segoe UI", size: 9 },
          alignment: { vertical: "middle", wrapText: true },
          border: thinBorder,
          fill: idx % 2 === 1 ? { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } } : undefined,
        });
      });

      detailSheet.addRow([]);
      detailSheet.addRow([]);
    }

    // SECTION D: CHI TIẾT CÔNG VIỆC KHÁC
    if (allOther.length > 0) {
      const dOtherTitle = detailSheet.addRow(["4. CHI TIẾT CÔNG VIỆC KHÁC", "", "", "", "", "", "", "", ""]);
      detailSheet.mergeCells(`A${dOtherTitle.number}:I${dOtherTitle.number}`);
      styleRow(dOtherTitle, {
        font: { name: "Segoe UI", size: 11, bold: true, color: { argb: PRIMARY } },
      });

      const dOtherH = detailSheet.addRow([
        "STT",
        "Nội dung công việc",
        "Khách liên quan",
        "Trạng thái",
        "Kết quả / Vướng mắc",
        "Hạn hoàn thành",
        "",
        "",
        "",
      ]);
      detailSheet.mergeCells(`E${dOtherH.number}:H${dOtherH.number}`);
      styleRow(dOtherH, {
        font: { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
        alignment: { vertical: "middle", horizontal: "center" },
        border: thinBorder,
      });

      allOther.forEach((t, idx) => {
        const row = detailSheet.addRow([
          idx + 1,
          sanitizeText(t.task_name),
          sanitizeText(t.customer_name || "—"),
          formatTaskStatusVi(t.status),
          sanitizeText(t.result_obstacle || "—"),
          "",
          "",
          "",
          formatDateVi(t.due_date || ""),
        ]);
        detailSheet.mergeCells(`E${row.number}:H${row.number}`);
        styleRow(row, {
          font: { name: "Segoe UI", size: 9 },
          alignment: { vertical: "middle", wrapText: true },
          border: thinBorder,
          fill: idx % 2 === 1 ? { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } } : undefined,
        });
      });
    }
  }

  return workbook;
}

function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Downloads single staff work report Excel (.xlsx).
 */
export async function downloadWorkReportExcel(options: WorkReportExportOptions) {
  const { staffName, startDate, endDate } = options;
  const isSingleDay = startDate === endDate;
  const dateStr = isSingleDay
    ? formatDateVi(startDate).replace(/\//g, "-")
    : `${formatDateVi(startDate).replace(/\//g, "-")}_den_${formatDateVi(endDate).replace(/\//g, "-")}`;
  const safeStaff = removeAccents(staffName) || "NhanVien";
  const filename = `Bao_cao_cong_viec_${safeStaff}_${dateStr}.xlsx`;

  const workbook = await buildStaffWorkReportWorkbook(options);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a ZIP package containing multiple staff work reports.
 */
export async function downloadMultiStaffWorkReportZip(
  staffReports: WorkReportExportOptions[],
  startDate: string,
  endDate: string
) {
  const zip = new JSZip();

  for (const staffOpt of staffReports) {
    const workbook = await buildStaffWorkReportWorkbook(staffOpt);
    const buffer = await workbook.xlsx.writeBuffer();
    const safeStaff = removeAccents(staffOpt.staffName) || "NhanVien";
    const isSingleDay = startDate === endDate;
    const dateStr = isSingleDay
      ? formatDateVi(startDate).replace(/\//g, "-")
      : `${formatDateVi(startDate).replace(/\//g, "-")}_den_${formatDateVi(endDate).replace(/\//g, "-")}`;
    const filename = `Bao_cao_cong_viec_${safeStaff}_${dateStr}.xlsx`;

    zip.file(filename, buffer);
  }

  const isSingleDay = startDate === endDate;
  const dateStr = isSingleDay
    ? formatDateVi(startDate).replace(/\//g, "-")
    : `${formatDateVi(startDate).replace(/\//g, "-")}_den_${formatDateVi(endDate).replace(/\//g, "-")}`;
  const zipFilename = `Bao_cao_cong_viec_Tong_hop_${dateStr}.zip`;

  const zipContent = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipContent);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

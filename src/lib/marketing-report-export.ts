import ExcelJS from "exceljs";
import type { MarketingPostRow, MarketingEventRow } from "@/lib/report-data";
import { formatReportDate } from "@/lib/admin-report-export";
import type { MarketingLeadItem } from "@/lib/marketing-types";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, HATICO_BRANCHES } from "@/lib/marketing-types";
import { getMarketingLeadsAction } from "@/app/actions-marketing";

const PRIMARY = "FF0F2D59";
const BORDER = "FF475569";
const HEADER_FILL = "FF0F2D59";
const ALT_FILL = "FFF8FAFC";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER } },
  left: { style: "thin", color: { argb: BORDER } },
  bottom: { style: "thin", color: { argb: BORDER } },
  right: { style: "thin", color: { argb: BORDER } },
};

function styleRow(row: ExcelJS.Row, style: Partial<ExcelJS.Style>) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.style = { ...cell.style, ...style };
  });
}

const PERIOD_LABELS = {
  week: "1 tuần",
  month: "1 tháng",
  all: "Tất cả",
} as const;

type ExportOptions = {
  period: keyof typeof PERIOD_LABELS;
  staffName: string;
  branchName?: string;
  posts: MarketingPostRow[];
  events: MarketingEventRow[];
  customers?: MarketingLeadItem[];
  startDate?: string;
  endDate?: string;
};

export async function downloadMarketingReportExcel(filename: string, options: ExportOptions) {
  const { period, staffName, branchName, posts, events } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hatico Manager";
  workbook.calcProperties.fullCalcOnLoad = true;

  // 1. Fetch logo
  let imageId: number | undefined;
  try {
    const response = await fetch("/logo/hatico_logo.png");
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      imageId = workbook.addImage({
        buffer,
        extension: "png",
      });
    }
  } catch (err) {
    console.error("Failed to load logo for Excel", err);
  }

  let tiktokCount = 0, tiktokViews = 0, tiktokOver5k = 0, tiktokOver10k = 0;
  let fbCount = 0, fbReach = 0, fbInteractions = 0, fbComments = 0;
  let ytCount = 0;
  let webCount = 0;

  posts.forEach(p => {
    const rawViews = String(p.views || "").toLowerCase();
    const views = rawViews.includes(">10k") || rawViews.includes("> 10k")
      ? 10000
      : (rawViews.includes(">5k") || rawViews.includes("> 5k")
        ? 5000
        : (rawViews.includes(">2k") || rawViews.includes("> 2k")
          ? 2000
          : (rawViews.includes(">1k") || rawViews.includes("> 1k")
            ? 1000
            : (parseInt(rawViews.replace(/[^0-9]/g, "")) || 0))));
    const likes = parseInt(String(p.likes).replace(/[^0-9]/g, "")) || 0;
    const comments = parseInt(String(p.comments).replace(/[^0-9]/g, "")) || 0;
    const shares = parseInt(String(p.shares).replace(/[^0-9]/g, "")) || 0;

    if (p.platform.includes("Tiktok")) {
      tiktokCount++;
      tiktokViews += views;
      if (views >= 10000) tiktokOver10k++;
      if (views >= 5000) tiktokOver5k++; 
    }
    if (p.platform.includes("Facebook")) {
      fbCount++;
      fbReach += views; // reach
      fbInteractions += (likes + comments + shares);
      fbComments += comments; // proxy for messages/comments
    }
    if (p.platform.includes("Youtube")) {
      ytCount++;
    }
    if (p.platform.includes("Website")) {
      webCount++;
    }
  });

  const kpiData = [
    { name: "[TikTok] Sản lượng video", target: 30, actual: tiktokCount },
    { name: "[TikTok] Tổng lượt xem", target: 60000, actual: tiktokViews },
    { name: "[TikTok] Video > 5.000 views", target: 5, actual: tiktokOver5k },
    { name: "[TikTok] Video > 10.000 views", target: 1, actual: tiktokOver10k },
    { name: "[Facebook] Sản lượng bài đăng", target: 25, actual: fbCount },
    { name: "[Facebook] Tổng reach (tiếp cận)", target: 60000, actual: fbReach },
    { name: "[Facebook] Tổng tương tác", target: 2000, actual: fbInteractions },
    { name: "[Facebook] Bình luận/tin nhắn", target: 30, actual: fbComments },
    { name: "[Website] Sản lượng bài viết", target: 2, actual: webCount },
    { name: "[YouTube] Sản lượng video/shorts", target: 8, actual: ytCount },
  ];

  // --- SHEET 1: ĐÁNH GIÁ KPI ---
  const kpiSheet = workbook.addWorksheet("Đánh giá KPI", {
    views: [{ showGridLines: true }],
  });
  
  kpiSheet.columns = [
    { key: "name", width: 25 },
    { key: "target", width: 16 },
    { key: "actual", width: 16 },
    { key: "percent", width: 16 },
  ];

  const addMergedLineKpi = (
    text: string,
    style: Partial<ExcelJS.Style>,
    endCol: string = "D"
  ) => {
    const row = kpiSheet.addRow([text, "", "", ""]);
    const n = row.number;
    kpiSheet.mergeCells(`A${n}:${endCol}${n}`);
    styleRow(row, style);
    return n;
  };

  const kLine1 = addMergedLineKpi("CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO", {
    font: { bold: true, size: 11 },
    alignment: { vertical: "middle" },
  });
  kpiSheet.getRow(kLine1).height = 24;

  const kLine2 = addMergedLineKpi("ĐÁNH GIÁ KPI MARKETING", {
    font: { bold: true, size: 14, color: { argb: PRIMARY } },
    alignment: { vertical: "middle" },
  });
  kpiSheet.getRow(kLine2).height = 32;

  const kLine3 = addMergedLineKpi(
    `Nhân viên: ${staffName}${branchName ? ` · ${branchName}` : ""} · Khoảng: ${PERIOD_LABELS[period]}`,
    {
      font: { size: 10, color: { argb: "FF334155" } },
      alignment: { wrapText: true, vertical: "middle" },
    }
  );
  kpiSheet.getRow(kLine3).height = 24;

  if (imageId !== undefined) {
    kpiSheet.addImage(imageId, {
      tl: { col: 3, row: 0 },
      ext: { width: 160, height: 75 },
    });
  }

  kpiSheet.addRow([]);

  const kpiHeaderRow = kpiSheet.addRow([
    "Hạng mục",
    "Chỉ tiêu (Tháng)",
    "Thực tế đạt",
    "Tỉ lệ đạt (%)"
  ]);
  styleRow(kpiHeaderRow, {
    font: { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
    border: thinBorder,
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
  });
  kpiHeaderRow.height = 22;

  kpiData.forEach((row, i) => {
    const ratio = row.target > 0 ? row.actual / row.target : 0;
    const percent = ratio * 100;
    const rowNum = 6 + i;
    const dataRow = kpiSheet.addRow([
      row.name,
      row.target,
      row.actual,
      {
        formula: `IF(B${rowNum}>0, C${rowNum}/B${rowNum}, 0)`,
        result: ratio,
      },
    ]);
    
    styleRow(dataRow, {
      font: { size: 10, bold: row.name === "Tổng bài đăng" },
      fill:
        i % 2 === 1
          ? { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } }
          : undefined,
      border: thinBorder,
      alignment: { vertical: "middle", wrapText: true },
    });
    
    dataRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    dataRow.getCell(2).numFmt = "#,##0";
    dataRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    dataRow.getCell(3).numFmt = "#,##0";
    
    const percentCell = dataRow.getCell(4);
    percentCell.alignment = { horizontal: "center", vertical: "middle" };
    percentCell.numFmt = "0.0%";
    
    if (percent >= 100) {
      percentCell.font = { size: 10, bold: true, color: { argb: "FF16A34A" } }; // Green
    } else if (percent >= 80) {
      percentCell.font = { size: 10, bold: true, color: { argb: "FFCA8A04" } }; // Yellow
    } else {
      percentCell.font = { size: 10, bold: true, color: { argb: "FFDC2626" } }; // Red
    }
  });

  // --- SHEET 2: HIỆU SUẤT ĐĂNG BÀI ---
  const postSheet = workbook.addWorksheet("Hiệu suất đăng bài", {
    views: [{ showGridLines: true }],
  });

  postSheet.columns = [
    { key: "platform", width: 14 },
    { key: "title", width: 35 },
    { key: "link", width: 24 },
    { key: "views", width: 12 },
    { key: "likes", width: 12 },
    { key: "date", width: 14 },
  ];

  const addMergedLinePost = (
    text: string,
    style: Partial<ExcelJS.Style>,
    endCol: string = "F"
  ) => {
    const row = postSheet.addRow([text, "", "", "", "", ""]);
    const n = row.number;
    postSheet.mergeCells(`A${n}:${endCol}${n}`);
    styleRow(row, style);
    return n;
  };

  const pLine1 = addMergedLinePost("CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO", {
    font: { bold: true, size: 11 },
    alignment: { vertical: "middle" },
  });
  postSheet.getRow(pLine1).height = 24;

  const pLine2 = addMergedLinePost("BÁO CÁO HIỆU SUẤT ĐĂNG BÀI MARKETING", {
    font: { bold: true, size: 14, color: { argb: PRIMARY } },
    alignment: { vertical: "middle" },
  });
  postSheet.getRow(pLine2).height = 32;

  const platformCounts = [];
  if (tiktokCount > 0) platformCounts.push(`Tiktok: ${tiktokCount}`);
  if (fbCount > 0) platformCounts.push(`Facebook: ${fbCount}`);
  if (ytCount > 0) platformCounts.push(`Youtube: ${ytCount}`);
  if (webCount > 0) platformCounts.push(`Website: ${webCount}`);
  const platformStatsStr = platformCounts.length > 0 ? ` (${platformCounts.join(", ")})` : "";

  const expandedPosts: (MarketingPostRow & { platformDisplay: string })[] = [];
  posts.forEach((post) => {
    const raw = post.platform || "";
    const list = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (list.length > 1) {
      list.forEach((p) => {
        expandedPosts.push({
          ...post,
          platformDisplay: p,
        });
      });
    } else {
      expandedPosts.push({
        ...post,
        platformDisplay: list[0] || post.platform || "—",
      });
    }
  });

  const pLine3 = addMergedLinePost(
    `Nhân viên: ${staffName}${branchName ? ` · ${branchName}` : ""} · Khoảng: ${PERIOD_LABELS[period]} · Tổng: ${expandedPosts.length} bài viết${platformStatsStr}`,
    {
      font: { size: 10, color: { argb: "FF334155" } },
      alignment: { wrapText: true, vertical: "middle" },
    }
  );
  postSheet.getRow(pLine3).height = 24;

  if (imageId !== undefined) {
    postSheet.addImage(imageId, {
      tl: { col: 5, row: 0 },
      ext: { width: 160, height: 75 },
    });
  }

  postSheet.addRow([]);

  const postHeaderRow = postSheet.addRow([
    "Nền tảng",
    "Tiêu đề / Nội dung bài đăng",
    "Đường dẫn (Link)",
    "Lượt xem",
    "Lượt thích",
    "Ngày",
  ]);
  styleRow(postHeaderRow, {
    font: { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
    border: thinBorder,
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
  });
  postHeaderRow.height = 22;

  if (expandedPosts.length === 0) {
    const emptyRow = postSheet.addRow(["—", "—", "—", "—", "—", "Chưa có dữ liệu"]);
    styleRow(emptyRow, {
      font: { size: 10, italic: true, color: { argb: "FF64748B" } },
      border: thinBorder,
      alignment: { vertical: "middle", horizontal: "center" },
    });
  } else {
    expandedPosts.forEach((post, i) => {
      const dataRow = postSheet.addRow([
        post.platformDisplay,
        post.title,
        post.link,
        post.views,
        post.likes,
        formatReportDate(post.report_date),
      ]);
      styleRow(dataRow, {
        font: { size: 10 },
        fill:
          i % 2 === 1
            ? { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } }
            : undefined,
        border: thinBorder,
        alignment: { vertical: "top", wrapText: true },
      });
      dataRow.getCell(1).alignment = { vertical: "top", horizontal: "center", wrapText: true };
    });
  }

  // --- SHEET 3: DANH SÁCH KHÁCH HÀNG (NẾU CÓ HOẶC TRUY VẤN THEO KỲ) ---
  let customerList: MarketingLeadItem[] = options.customers || [];
  if (customerList.length === 0) {
    try {
      const dates = posts.map((p) => p.report_date).filter(Boolean).sort();
      const startDate = options.startDate || dates[0];
      const endDate = options.endDate || dates[dates.length - 1];
      if (startDate && endDate) {
        const res = await getMarketingLeadsAction(undefined, undefined, startDate, endDate);
        if (res && "data" in res && Array.isArray(res.data)) {
          customerList = res.data;
        }
      }
    } catch (e) {
      console.warn("Could not fetch customer leads for report export", e);
    }
  }

  if (customerList.length > 0) {
    const custSheet = workbook.addWorksheet("Danh sách khách hàng", {
      views: [{ showGridLines: true }],
    });

    custSheet.columns = [
      { key: "stt", width: 6 },
      { key: "lead_date", width: 14 },
      { key: "full_name", width: 22 },
      { key: "phone", width: 16 },
      { key: "address", width: 20 },
      { key: "demand", width: 26 },
      { key: "source", width: 18 },
      { key: "branch", width: 22 },
      { key: "status", width: 18 },
      { key: "order_id", width: 16 },
      { key: "assigned", width: 18 },
      { key: "notes", width: 26 },
    ];

    const addMergedLineCust = (
      text: string,
      style: Partial<ExcelJS.Style>,
      endCol: string = "L"
    ) => {
      const row = custSheet.addRow([text]);
      const n = row.number;
      custSheet.mergeCells(`A${n}:${endCol}${n}`);
      styleRow(row, style);
      return n;
    };

    const cLine1 = addMergedLineCust("CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO", {
      font: { bold: true, size: 11 },
      alignment: { vertical: "middle" },
    });
    custSheet.getRow(cLine1).height = 24;

    const cLine2 = addMergedLineCust(
      `DANH SÁCH KHÁCH HÀNG TIẾP NHẬN MARKETING (${customerList.length} KHÁCH HÀNG)`,
      {
        font: { bold: true, size: 14, color: { argb: PRIMARY } },
        alignment: { horizontal: "center", vertical: "middle" },
      }
    );
    custSheet.getRow(cLine2).height = 28;

    const cLine3 = addMergedLineCust(
      `Kỳ báo cáo: ${PERIOD_LABELS[period]}  |  Phạm vi: ${branchName || "Toàn hệ thống"}  |  Người lập: ${staffName}`,
      {
        font: { italic: true, size: 9.5, color: { argb: "FF475569" } },
        alignment: { horizontal: "center", vertical: "middle" },
      }
    );
    custSheet.getRow(cLine3).height = 20;

    custSheet.addRow([]); // Blank spacer

    const custHeaderRow = custSheet.addRow([
      "STT",
      "Ngày nhận",
      "Họ và tên khách hàng",
      "Số điện thoại",
      "Tỉnh / Khu vực",
      "Nhu cầu quan tâm",
      "Nguồn tiếp cận",
      "Chi nhánh xử lý",
      "Trạng thái",
      "Mã đơn hàng",
      "Nhân sự phụ trách",
      "Ghi chú",
    ]);
    styleRow(custHeaderRow, {
      font: { bold: true, color: { argb: "FFFFFFFF" }, size: 9.5 },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
      border: thinBorder,
      alignment: { horizontal: "center", vertical: "middle" },
    });
    custHeaderRow.height = 24;

    customerList.forEach((c, idx) => {
      const bName =
        HATICO_BRANCHES.find((b) => b.id === c.handler_branch_id || b.id === c.branch_id)?.name ||
        c.handler_branch_name ||
        c.branch_name ||
        "—";
      const srcName = LEAD_SOURCE_LABELS[c.source] || c.source || "—";
      const stName = LEAD_STATUS_LABELS[c.status] || c.status || "Mới quan tâm";

      const cRow = custSheet.addRow([
        idx + 1,
        formatReportDate(c.lead_date),
        c.full_name || "—",
        c.phone ? String(c.phone) : "—",
        c.address || "—",
        c.demand || "—",
        srcName,
        bName,
        stName,
        c.order_id || "—",
        c.assigned_staff_name || "—",
        c.notes || "",
      ]);

      cRow.getCell(4).numFmt = "@"; // Text format for phone

      styleRow(cRow, {
        font: { size: 9.5 },
        fill:
          idx % 2 === 1
            ? { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } }
            : undefined,
        border: thinBorder,
        alignment: { vertical: "middle" },
      });

      cRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      cRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      cRow.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      cRow.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      cRow.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
      cRow.getCell(10).alignment = { horizontal: "center", vertical: "middle" };

      if (c.status === "closed") {
        cRow.getCell(9).font = { bold: true, color: { argb: "FF059669" }, size: 9.5 };
      } else if (c.status === "converted") {
        cRow.getCell(9).font = { bold: true, color: { argb: "FF1E3A8A" }, size: 9.5 };
      }
      cRow.height = 21;
    });
  }

  // --- DOWNLOAD ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

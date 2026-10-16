import ExcelJS from "exceljs";
import { MarketingPeriodicReport } from "./periodic-marketing-types";
import { HATICO_BRANCHES, isPostInBranch, getBranchPIC } from "./marketing-types";


const NAVY = "FF0F2D59";
const NAVY_LIGHT = "FF1E3A8A";
const BORDER_COLOR = "FFCBD5E1";
const HEADER_FILL = "FF0F2D59";
const SUBHEADER_FILL = "FFF1F5F9";
const ALT_ROW_FILL = "FFF8FAFC";
const ACCENT_GREEN = "FF059669";
const ACCENT_RED = "FFE11D48";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
};

function formatCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0 đ";
  return new Intl.NumberFormat("vi-VN").format(val) + " đ";
}

function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0";
  return new Intl.NumberFormat("vi-VN").format(val);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export async function exportPeriodicMarketingReportExcel(report: MarketingPeriodicReport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hatico Manager";
  workbook.created = new Date();

  // Try to load logo
  let imageId: number | undefined;
  try {
    const res = await fetch("/logo/hatico_logo.png");
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      imageId = workbook.addImage({
        buffer,
        extension: "png",
      });
    }
  } catch (e) {
    console.warn("Could not load logo for export", e);
  }

  const kpis = report.data.kpis;
  const prevKpis = report.data.prevKpis;
  const kpiComp = report.data.kpiComparison;
  const channelResults = report.data.channelResults || [];
  const channelTotals = report.data.channelTotals;
  const branchResults = report.data.branchResults || [];
  const totalSystemBranch = report.data.totalSystemBranch;
  const topContents = report.data.topContents || [];
  const fbAds = report.data.facebookAds;
  const ttAds = report.data.tiktokAds;
  const evalData = report.evaluation;
  const actionPlan = report.actionPlan || [];

  const periodTitle = report.periodLabel || (
    report.reportType === "weekly"
      ? `TUẦN ${report.periodNumber} / ${report.year}`
      : `THÁNG ${report.periodNumber} / ${report.year}`
  );

  // ============================================================================
  // TAB 1: 📊 TỔNG QUAN & KPIS CỐT LÕI
  // ============================================================================
  const ws1 = workbook.addWorksheet("Tổng quan & KPIs", {
    views: [{ showGridLines: true }],
  });

  ws1.columns = [
    { width: 4 },  // A
    { width: 36 }, // B: Chỉ số
    { width: 18 }, // C: Kỳ này
    { width: 18 }, // D: Kỳ trước
    { width: 16 }, // E: Chênh lệch
    { width: 16 }, // F: % Biến động
    { width: 30 }, // G: Đánh giá / Ghi chú
  ];

  if (imageId !== undefined) {
    ws1.addImage(imageId, {
      tl: { col: 1, row: 1 },
      ext: { width: 130, height: 40 },
    });
  }

  // Header banner
  ws1.mergeCells("B2:G2");
  const title1 = ws1.getCell("B2");
  title1.value = `BÁO CÁO MARKETING ${periodTitle.toUpperCase()}`;
  title1.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: NAVY } };
  title1.alignment = { horizontal: "center", vertical: "middle" };

  ws1.mergeCells("B3:G3");
  const subTitle1 = ws1.getCell("B3");
  subTitle1.value = `Thời gian: ${formatDate(report.startDate)} – ${formatDate(report.endDate)} | Phạm vi: ${report.branchName} | Trạng thái: ${report.status === "closed" ? "ĐÃ CHỐT" : "BẢN NHÁP"}`;
  subTitle1.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF475569" } };
  subTitle1.alignment = { horizontal: "center", vertical: "middle" };

  ws1.mergeCells("B4:G4");
  const meta1 = ws1.getCell("B4");
  meta1.value = `Người lập: ${report.creatorName} ${report.closedBy ? `| Chốt bởi: ${report.closedBy}` : ""} | Xuất file: ${new Date().toLocaleString("vi-VN")}`;
  meta1.font = { name: "Segoe UI", size: 9, color: { argb: "FF64748B" } };
  meta1.alignment = { horizontal: "center", vertical: "middle" };

  // Section 1: KPI Table Header
  let r = 6;
  ws1.mergeCells(`B${r}:G${r}`);
  const secH1 = ws1.getCell(`B${r}`);
  secH1.value = "PHẦN I. 8 CHỈ SỐ KPI MARKETING CỐT LÕI";
  secH1.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  secH1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH1.alignment = { vertical: "middle", indent: 1 };
  ws1.getRow(r).height = 25;

  r++;
  const kpiCols = ["Chỉ số hiệu quả cốt lõi", "Kỳ báo cáo này", "Kỳ đối chiếu", "Chênh lệch", "% Tăng/Giảm", "Nhận định"];
  kpiCols.forEach((col, idx) => {
    const c = ws1.getCell(r, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: idx >= 1 && idx <= 4 ? "center" : "left", vertical: "middle" };
  });
  ws1.getRow(r).height = 22;

  const kpiList = [
    { label: "1. Tổng nội dung đăng (bài viết / video)", key: "totalContents" as const, isMoney: false },
    { label: "2. Tổng lượt xem nội dung (views)", key: "totalViews" as const, isMoney: false },
    { label: "3. Tổng lượt tương tác (likes/comments/shares)", key: "totalInteractions" as const, isMoney: false },
    { label: "4. Tổng khách hàng quan tâm (leads)", key: "totalLeads" as const, isMoney: false },
    { label: "5. Khách hàng được tư vấn", key: "totalConsulted" as const, isMoney: false },
    { label: "6. Khách hàng chuyển đổi thực tế", key: "totalConverted" as const, isMoney: false },
    { label: "7. Đơn hàng chốt thành công", key: "totalOrders" as const, isMoney: false },
    { label: "8. Tổng chi phí quảng cáo", key: "totalAdSpend" as const, isMoney: true },
  ];

  kpiList.forEach((item, i) => {
    r++;
    const comp = kpiComp[item.key];
    const currVal = item.isMoney ? formatCurrency(comp.current) : formatNumber(comp.current);
    const prevVal = comp.previous !== null ? (item.isMoney ? formatCurrency(comp.previous) : formatNumber(comp.previous)) : "—";
    const diffVal = comp.diff !== null ? (item.isMoney ? formatCurrency(comp.diff) : (comp.diff > 0 ? `+${formatNumber(comp.diff)}` : formatNumber(comp.diff))) : "—";
    
    let pctVal = "—";
    let pctColor = "FF334155";
    if (comp.percent !== null) {
      if (comp.percent > 0) {
        pctVal = `+${comp.percent.toFixed(1)}%`;
        pctColor = ACCENT_GREEN;
      } else if (comp.percent < 0) {
        pctVal = `${comp.percent.toFixed(1)}%`;
        pctColor = ACCENT_RED;
      } else {
        pctVal = "0.0%";
      }
    }

    let note = "Ổn định";
    if (comp.percent !== null) {
      if (comp.percent > 10) note = "Tăng trưởng tốt";
      else if (comp.percent < -10) note = "Cần cải thiện";
    }

    const rowBg = i % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
    const cells = [
      { col: 2, val: item.label, align: "left" as const, bold: false, color: "FF0F172A" },
      { col: 3, val: currVal, align: "right" as const, bold: true, color: "FF0F172A" },
      { col: 4, val: prevVal, align: "right" as const, bold: false, color: "FF64748B" },
      { col: 5, val: diffVal, align: "right" as const, bold: false, color: "FF334155" },
      { col: 6, val: pctVal, align: "center" as const, bold: true, color: pctColor },
      { col: 7, val: note, align: "left" as const, bold: false, color: "FF475569" },
    ];

    cells.forEach((cell) => {
      const c = ws1.getCell(r, cell.col);
      c.value = cell.val;
      c.font = { name: "Segoe UI", size: 9.5, bold: cell.bold, color: { argb: cell.color } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      c.border = thinBorder;
      c.alignment = { horizontal: cell.align, vertical: "middle" };
    });
    ws1.getRow(r).height = 21;
  });

  // Tóm tắt chỉ số chuyển đổi phễu
  r += 2;
  ws1.mergeCells(`B${r}:G${r}`);
  const secH1b = ws1.getCell(`B${r}`);
  secH1b.value = "PHẦN II. HIỆU QUẢ CHUYỂN ĐỔI PHỄU MARKETING & CHI PHÍ";
  secH1b.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  secH1b.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH1b.alignment = { vertical: "middle", indent: 1 };
  ws1.getRow(r).height = 25;

  r++;
  const funnelCols = ["Chỉ số chuyển đổi", "Giá trị", "Công thức / Đơn vị", "Kỳ trước", "% Biến động", "Đánh giá"];
  funnelCols.forEach((col, idx) => {
    const c = ws1.getCell(r, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: idx >= 1 && idx <= 4 ? "center" : "left", vertical: "middle" };
  });
  ws1.getRow(r).height = 22;

  const convRate = kpis.totalLeads > 0 ? ((kpis.totalOrders / kpis.totalLeads) * 100).toFixed(1) + "%" : "0%";
  const cpl = kpis.totalLeads > 0 ? formatCurrency(Math.round(kpis.totalAdSpend / kpis.totalLeads)) : "—";
  const cpo = kpis.totalOrders > 0 ? formatCurrency(Math.round(kpis.totalAdSpend / kpis.totalOrders)) : "—";
  const consultRate = kpis.totalLeads > 0 ? ((kpis.totalConsulted / kpis.totalLeads) * 100).toFixed(1) + "%" : "0%";

  const funnelRows = [
    { name: "Tỷ lệ chốt đơn trên Lead (Orders / Leads)", val: convRate, formula: "% Khách mua / Quan tâm", prev: "—", note: "Hiệu quả sales & chất lượng lead" },
    { name: "Tỷ lệ tiếp cận tư vấn (Consulted / Leads)", val: consultRate, formula: "% Khách được gọi tư vấn", prev: "—", note: "Tốc độ chăm sóc khách hàng" },
    { name: "Chi phí trung bình trên 1 Lead (CPL)", val: cpl, formula: "Tổng Ads / Tổng Leads", prev: "—", note: "Hiệu quả chi phí quảng cáo" },
    { name: "Chi phí trung bình trên 1 Đơn chốt (CPO)", val: cpo, formula: "Tổng Ads / Tổng Đơn chốt", prev: "—", note: "Giá vốn marketing trên mỗi đơn xe" },
  ];

  funnelRows.forEach((row, i) => {
    r++;
    const rowBg = i % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
    const cells = [
      { col: 2, val: row.name, align: "left" as const, bold: false, color: "FF0F172A" },
      { col: 3, val: row.val, align: "right" as const, bold: true, color: "FF0F172A" },
      { col: 4, val: row.formula, align: "center" as const, bold: false, color: "FF64748B" },
      { col: 5, val: row.prev, align: "center" as const, bold: false, color: "FF64748B" },
      { col: 6, val: "—", align: "center" as const, bold: false, color: "FF64748B" },
      { col: 7, val: row.note, align: "left" as const, bold: false, color: "FF475569" },
    ];
    cells.forEach((cell) => {
      const c = ws1.getCell(r, cell.col);
      c.value = cell.val;
      c.font = { name: "Segoe UI", size: 9.5, bold: cell.bold, color: { argb: cell.color } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      c.border = thinBorder;
      c.alignment = { horizontal: cell.align, vertical: "middle" };
    });
    ws1.getRow(r).height = 21;
  });

  // ============================================================================
  // TAB 2: 🏢🌐 KÊNH & CHI NHÁNH (COMBINED CHANNELS & BRANCHES)
  // ============================================================================
  const ws2 = workbook.addWorksheet("Kênh & Chi nhánh", {
    views: [{ showGridLines: true }],
  });

  ws2.columns = [
    { width: 4 },  // A
    { width: 6 },  // B: STT
    { width: 28 }, // C: Tên đơn vị / Kênh
    { width: 15 }, // D: Số bài đăng / Video
    { width: 16 }, // E
    { width: 16 }, // F
    { width: 16 }, // G
    { width: 15 }, // H
    { width: 16 }, // I
    { width: 18 }, // J
    { width: 18 }, // K: Chi phí Ads
    { width: 18 }, // L: CPL
  ];

  ws2.mergeCells("B2:L2");
  const title2 = ws2.getCell("B2");
  title2.value = `TỔNG HỢP PHÂN BỔ MARKETING THEO CHI NHÁNH & KÊNH NỀN TẢNG – ${periodTitle.toUpperCase()}`;
  title2.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: NAVY } };
  title2.alignment = { horizontal: "center", vertical: "middle" };

  // --------------------------------------------------------------------------
  // PHẦN I: HIỆU QUẢ MARKETING THEO CHI NHÁNH (5 CHI NHÁNH HATICO)
  // --------------------------------------------------------------------------
  r = 4;
  ws2.mergeCells(`B${r}:J${r}`);
  const secH2a = ws2.getCell(`B${r}`);
  secH2a.value = "PHẦN I. HIỆU QUẢ MARKETING THEO CHI NHÁNH (5 CHI NHÁNH HATICO)";
  secH2a.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  secH2a.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH2a.alignment = { vertical: "middle", indent: 1 };
  ws2.getRow(r).height = 24;

  r++;
  const branchCols = [
    "STT",
    "Chi nhánh Hatico",
    "Số bài đăng",
    "Khách quan tâm",
    "Đã tư vấn",
    "Chuyển đổi",
    "Đơn chốt",
    "Chi phí Ads",
    "Tỷ lệ chốt đơn (%)",
  ];

  branchCols.forEach((col, idx) => {
    const c = ws2.getCell(r, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws2.getRow(r).height = 23;

  const totalBranchSumPosts = branchResults.reduce((sum, b) => sum + (b.contentCount || 0), 0);

  branchResults.forEach((b, idx) => {
    r++;
    const rowBg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
    const closeRate = b.leads > 0 ? ((b.orders / b.leads) * 100).toFixed(1) + "%" : "0%";

    const cells = [
      { col: 2, val: idx + 1, align: "center" as const },
      { col: 3, val: b.branchName, align: "left" as const, bold: true },
      { col: 4, val: b.contentCount, align: "right" as const, isNum: true },
      { col: 5, val: b.leads, align: "right" as const, isNum: true },
      { col: 6, val: b.consulted, align: "right" as const, isNum: true },
      { col: 7, val: b.converted, align: "right" as const, isNum: true },
      { col: 8, val: b.orders, align: "right" as const, isNum: true },
      { col: 9, val: b.adSpend > 0 ? formatCurrency(b.adSpend) : "—", align: "right" as const },
      { col: 10, val: closeRate, align: "center" as const, bold: true },
    ];

    cells.forEach((cell) => {
      const c = ws2.getCell(r, cell.col);
      c.value = cell.val;
      c.font = { name: "Segoe UI", size: 9.5, bold: cell.bold || false, color: { argb: "FF0F172A" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      c.border = thinBorder;
      c.alignment = { horizontal: cell.align, vertical: "middle" };
      if (cell.isNum && typeof cell.val === "number") {
        c.numFmt = "#,##0";
      }
    });
    ws2.getRow(r).height = 21;
  });

  // Total branch row - chuẩn xác theo tổng số bài của các chi nhánh
  r++;
  const totCloseRate = totalSystemBranch.leads > 0
    ? ((totalSystemBranch.orders / totalSystemBranch.leads) * 100).toFixed(1) + "%"
    : "0%";

  const bTotCells = [
    { col: 2, val: "", align: "center" as const },
    { col: 3, val: "TỔNG TOÀN HỆ THỐNG", align: "left" as const },
    { col: 4, val: totalBranchSumPosts, align: "right" as const, isNum: true },
    { col: 5, val: totalSystemBranch.leads, align: "right" as const, isNum: true },
    { col: 6, val: totalSystemBranch.consulted, align: "right" as const, isNum: true },
    { col: 7, val: totalSystemBranch.converted, align: "right" as const, isNum: true },
    { col: 8, val: totalSystemBranch.orders, align: "right" as const, isNum: true },
    { col: 9, val: totalSystemBranch.adSpend > 0 ? formatCurrency(totalSystemBranch.adSpend) : "—", align: "right" as const },
    { col: 10, val: totCloseRate, align: "center" as const },
  ];

  bTotCells.forEach((cell) => {
    const c = ws2.getCell(r, cell.col);
    c.value = cell.val;
    c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: cell.align, vertical: "middle" };
    if (cell.isNum && typeof cell.val === "number") {
      c.numFmt = "#,##0";
    }
  });
  ws2.getRow(r).height = 23;

  // --------------------------------------------------------------------------
  // PHẦN II: HIỆU QUẢ MARKETING THEO KÊNH TRUYỀN THÔNG & NỀN TẢNG
  // --------------------------------------------------------------------------
  r += 3;
  ws2.mergeCells(`B${r}:L${r}`);
  const secH2b = ws2.getCell(`B${r}`);
  secH2b.value = "PHẦN II. HIỆU QUẢ MARKETING THEO KÊNH TRUYỀN THÔNG & NỀN TẢNG";
  secH2b.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  secH2b.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH2b.alignment = { vertical: "middle", indent: 1 };
  ws2.getRow(r).height = 24;

  r++;
  const channelCols = [
    "STT",
    "Kênh / Nền tảng",
    "Số bài/video",
    "Lượt xem (Views)",
    "Lượt tương tác",
    "Khách quan tâm",
    "Được tư vấn",
    "Chuyển đổi",
    "Đơn chốt",
    "Chi phí Ads",
    "CPL (Chi phí/Lead)",
  ];

  channelCols.forEach((col, idx) => {
    const c = ws2.getCell(r, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws2.getRow(r).height = 23;

  channelResults.forEach((ch, idx) => {
    r++;
    const rowBg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
    const chSpend = ch.platform === "facebook" ? fbAds.totalCost : ch.platform === "tiktok" ? ttAds.totalCost : 0;
    const chCpl = ch.leads > 0 && chSpend > 0
      ? formatCurrency(Math.round(chSpend / ch.leads))
      : "—";

    const cells = [
      { col: 2, val: idx + 1, align: "center" as const },
      { col: 3, val: ch.platformName, align: "left" as const, bold: true },
      { col: 4, val: ch.contentCount, align: "right" as const, isNum: true },
      { col: 5, val: ch.views, align: "right" as const, isNum: true },
      { col: 6, val: ch.interactions !== null ? ch.interactions : "—", align: "right" as const, isNum: ch.interactions !== null },
      { col: 7, val: ch.leads, align: "right" as const, isNum: true },
      { col: 8, val: ch.consulted, align: "right" as const, isNum: true },
      { col: 9, val: ch.converted, align: "right" as const, isNum: true },
      { col: 10, val: ch.orders, align: "right" as const, isNum: true },
      { col: 11, val: chSpend > 0 ? formatCurrency(chSpend) : "—", align: "right" as const },
      { col: 12, val: chCpl, align: "right" as const },
    ];

    cells.forEach((cell) => {
      const c = ws2.getCell(r, cell.col);
      c.value = cell.val;
      c.font = { name: "Segoe UI", size: 9.5, bold: cell.bold || false, color: { argb: "FF0F172A" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      c.border = thinBorder;
      c.alignment = { horizontal: cell.align, vertical: "middle" };
      if (cell.isNum && typeof cell.val === "number") {
        c.numFmt = "#,##0";
      }
    });
    ws2.getRow(r).height = 21;
  });

  // Total Channel Row
  r++;
  const totalSpend = (fbAds?.totalCost || 0) + (ttAds?.totalCost || 0);
  const totalCpl = channelTotals.leads > 0 && totalSpend > 0 ? formatCurrency(Math.round(totalSpend / channelTotals.leads)) : "—";
  const totCells = [
    { col: 2, val: "", align: "center" as const },
    { col: 3, val: "TỔNG TOÀN HỆ THỐNG", align: "left" as const },
    { col: 4, val: channelTotals.contentCount, align: "right" as const, isNum: true },
    { col: 5, val: channelTotals.views, align: "right" as const, isNum: true },
    { col: 6, val: channelTotals.interactions, align: "right" as const, isNum: true },
    { col: 7, val: channelTotals.leads, align: "right" as const, isNum: true },
    { col: 8, val: channelTotals.consulted, align: "right" as const, isNum: true },
    { col: 9, val: channelTotals.converted, align: "right" as const, isNum: true },
    { col: 10, val: channelTotals.orders, align: "right" as const, isNum: true },
    { col: 11, val: formatCurrency(totalSpend), align: "right" as const },
    { col: 12, val: totalCpl, align: "right" as const },
  ];

  totCells.forEach((cell) => {
    const c = ws2.getCell(r, cell.col);
    c.value = cell.val;
    c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: cell.align, vertical: "middle" };
    if (cell.isNum && typeof cell.val === "number") {
      c.numFmt = "#,##0";
    }
  });
  ws2.getRow(r).height = 23;

  // ============================================================================
  // TAB 3: 📝 CHI TIẾT BÀI VIẾT & VIDEO ĐÃ ĐĂNG (GOM THEO CHI NHÁNH)
  // ============================================================================
  const ws3 = workbook.addWorksheet("Chi tiết bài viết", {
    views: [{ showGridLines: true }],
  });

  ws3.columns = [
    { width: 4 },  // A
    { width: 6 },  // B: STT
    { width: 14 }, // C: Ngày đăng
    { width: 16 }, // D: Nền tảng
    { width: 22 }, // E: Chi nhánh
    { width: 45 }, // F: Tiêu đề nội dung
    { width: 14 }, // G: Lượt xem
    { width: 14 }, // H: Tương tác
    { width: 14 }, // I: Khách hỏi (Leads)
    { width: 14 }, // J: Đơn chốt
    { width: 22 }, // K: Người phụ trách
    { width: 35 }, // L: Link bài viết
  ];

  ws3.mergeCells("B2:L2");
  const title3 = ws3.getCell("B2");
  title3.value = `DANH SÁCH CHI TIẾT TẤT CẢ BÀI VIẾT & VIDEO ĐÃ ĐĂNG TRONG KỲ (${topContents.length} BÀI)`;
  title3.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: NAVY } };
  title3.alignment = { horizontal: "center", vertical: "middle" };

  r = 4;
  const postCols = [
    "STT",
    "Ngày đăng",
    "Nền tảng",
    "Chi nhánh",
    "Tiêu đề nội dung",
    "Lượt xem",
    "Tương tác",
    "Leads",
    "Đơn chốt",
    "Người phụ trách",
    "Liên kết bài viết (Link)",
  ];

  postCols.forEach((col, idx) => {
    const c = ws3.getCell(r, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws3.getRow(r).height = 24;

  // Gom nhóm danh sách bài viết theo từng chi nhánh theo đúng thứ tự hệ thống
  const branchGroups: { branchId: string; branchName: string; posts: typeof topContents }[] = HATICO_BRANCHES.map((b) => {
    const posts = topContents.filter((p) => isPostInBranch(p, b.id));
    return {
      branchId: b.id,
      branchName: b.name,
      posts,
    };
  }).filter((g) => g.posts.length > 0);

  // Bài viết khác nếu có
  const matchedPostIds = new Set(branchGroups.flatMap((g) => g.posts.map((p) => p.id)));
  const otherPosts = topContents.filter((p) => !matchedPostIds.has(p.id));
  if (otherPosts.length > 0) {
    branchGroups.push({
      branchId: "other",
      branchName: "Chi nhánh khác",
      posts: otherPosts,
    });
  }

  let globalPostIndex = 0;

  branchGroups.forEach((group) => {
    // Tiêu đề phân nhóm chi nhánh (Section Header Banner)
    r++;
    ws3.mergeCells(`B${r}:L${r}`);
    const bHeader = ws3.getCell(`B${r}`);
    bHeader.value = `CHI NHÁNH: ${group.branchName.toUpperCase()} (${group.posts.length} BÀI VIẾT)`;
    bHeader.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
    bHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    bHeader.border = thinBorder;
    bHeader.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws3.getRow(r).height = 25;

    let groupViews = 0;
    let groupInteractions = 0;
    let groupLeads = 0;
    let groupOrders = 0;

    group.posts.forEach((post, pIdx) => {
      r++;
      globalPostIndex++;
      groupViews += (post.views || 0);
      groupInteractions += (post.interactions || 0);
      groupLeads += (post.leads || 0);
      groupOrders += (post.orders || 0);

      const rowBg = pIdx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";

      const cIndex = ws3.getCell(r, 2);
      cIndex.value = globalPostIndex;
      cIndex.alignment = { horizontal: "center", vertical: "middle" };

      const cDate = ws3.getCell(r, 3);
      cDate.value = formatDate(post.publishDate);
      cDate.alignment = { horizontal: "center", vertical: "middle" };

      const cPlatform = ws3.getCell(r, 4);
      cPlatform.value = post.platform;
      cPlatform.alignment = { horizontal: "center", vertical: "middle" };
      cPlatform.font = { name: "Segoe UI", size: 9, bold: true };

      const cBranch = ws3.getCell(r, 5);
      cBranch.value = post.branchName || group.branchName;
      cBranch.alignment = { horizontal: "left", vertical: "middle" };

      const cTitle = ws3.getCell(r, 6);
      cTitle.value = post.title;
      cTitle.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

      const cViews = ws3.getCell(r, 7);
      cViews.value = post.views;
      cViews.numFmt = "#,##0";
      cViews.alignment = { horizontal: "right", vertical: "middle" };

      const cInteractions = ws3.getCell(r, 8);
      cInteractions.value = post.interactions;
      cInteractions.numFmt = "#,##0";
      cInteractions.alignment = { horizontal: "right", vertical: "middle" };

      const cLeads = ws3.getCell(r, 9);
      cLeads.value = post.leads || 0;
      cLeads.numFmt = "#,##0";
      cLeads.alignment = { horizontal: "right", vertical: "middle" };

      const cOrders = ws3.getCell(r, 10);
      cOrders.value = post.orders || 0;
      cOrders.numFmt = "#,##0";
      cOrders.alignment = { horizontal: "right", vertical: "middle" };

      const cAuthor = ws3.getCell(r, 11);
      cAuthor.value = getBranchPIC(post.branchId, post.branchName || group.branchName);
      cAuthor.alignment = { horizontal: "left", vertical: "middle" };

      const cLink = ws3.getCell(r, 12);
      if (post.link && post.link.startsWith("http")) {
        cLink.value = {
          text: post.link.length > 38 ? post.link.slice(0, 38) + "..." : post.link,
          hyperlink: post.link,
        };
        cLink.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF2563EB" }, underline: true };
      } else {
        cLink.value = post.link || "—";
        cLink.font = { name: "Segoe UI", size: 9, color: { argb: "FF64748B" } };
      }
      cLink.alignment = { horizontal: "left", vertical: "middle" };

      for (let col = 2; col <= 12; col++) {
        const cell = ws3.getCell(r, col);
        if (!cell.font) cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.border = thinBorder;
      }
      ws3.getRow(r).height = 22;
    });

    // Dòng tổng phụ cho từng chi nhánh (Subtotal row)
    r++;
    ws3.mergeCells(`B${r}:F${r}`);
    const subTotTitle = ws3.getCell(`B${r}`);
    subTotTitle.value = `Tổng cộng ${group.branchName}:`;
    subTotTitle.font = { name: "Segoe UI", size: 9, bold: true, italic: true, color: { argb: "FF334155" } };
    subTotTitle.alignment = { horizontal: "right", vertical: "middle" };

    const subCells = [
      { col: 7, val: groupViews, isNum: true },
      { col: 8, val: groupInteractions, isNum: true },
      { col: 9, val: groupLeads, isNum: true },
      { col: 10, val: groupOrders, isNum: true },
      { col: 11, val: "—", align: "center" as const },
      { col: 12, val: "—", align: "center" as const },
    ];
    subCells.forEach((c) => {
      const cell = ws3.getCell(r, c.col);
      cell.value = c.val;
      cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: (c.align || "right") as any, vertical: "middle" };
      if (c.isNum) cell.numFmt = "#,##0";
    });

    for (let c = 2; c <= 12; c++) {
      const cell = ws3.getCell(r, c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      cell.border = thinBorder;
    }
    ws3.getRow(r).height = 21;
  });

  // ============================================================================
  // TAB 4: 🎯 QUẢNG CÁO & ĐÁNH GIÁ (ADS & EVALUATION)
  // ============================================================================
  const ws4 = workbook.addWorksheet("Quảng cáo & Đánh giá", {
    views: [{ showGridLines: true }],
  });

  ws4.columns = [
    { width: 4 },  // A
    { width: 34 }, // B: Mục / Tên chiến dịch
    { width: 22 }, // C: Chi nhánh / Kênh
    { width: 18 }, // D: Chi phí (VNĐ)
    { width: 16 }, // E: Khách quan tâm (Leads)
    { width: 16 }, // F: Khách tư vấn
    { width: 16 }, // G: Đơn chốt
    { width: 18 }, // H: CPL (đ/Lead)
  ];

  ws4.mergeCells("B2:H2");
  const title4 = ws4.getCell("B2");
  title4.value = `HIỆU QUẢ QUẢNG CÁO ADS & ĐÁNH GIÁ THỰC HIỆN – ${periodTitle.toUpperCase()}`;
  title4.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: NAVY } };
  title4.alignment = { horizontal: "center", vertical: "middle" };

  r = 4;
  ws4.mergeCells(`B${r}:H${r}`);
  const secH4a = ws4.getCell(`B${r}`);
  secH4a.value = "1. CHI TIẾT CHIẾN DỊCH FACEBOOK ADS";
  secH4a.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  secH4a.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH4a.alignment = { vertical: "middle", indent: 1 };
  ws4.getRow(r).height = 24;

  r++;
  const adsCols = ["Tên chiến dịch", "Chi nhánh", "Chi phí (VNĐ)", "Khách quan tâm", "Đã tư vấn", "Đơn chốt", "CPL (đ/Lead)"];
  adsCols.forEach((col, idx) => {
    const c = ws4.getCell(r, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws4.getRow(r).height = 22;

  const fbCampaigns = fbAds?.campaigns || [];
  if (fbCampaigns.length === 0) {
    r++;
    ws4.mergeCells(`B${r}:H${r}`);
    const emptyC = ws4.getCell(`B${r}`);
    emptyC.value = "Không có chiến dịch Facebook Ads phát sinh trong kỳ.";
    emptyC.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF64748B" } };
    emptyC.alignment = { horizontal: "center", vertical: "middle" };
    emptyC.border = thinBorder;
    ws4.getRow(r).height = 22;
  } else {
    fbCampaigns.forEach((camp, idx) => {
      r++;
      const rowBg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
      const cells = [
        { col: 2, val: camp.name, align: "left" as const, bold: true },
        { col: 3, val: camp.branchName || "Tổng kho", align: "left" as const },
        { col: 4, val: camp.cost, align: "right" as const, isMoney: true },
        { col: 5, val: camp.leads, align: "right" as const, isNum: true },
        { col: 6, val: camp.consulted, align: "right" as const, isNum: true },
        { col: 7, val: camp.orders, align: "right" as const, isNum: true },
        { col: 8, val: camp.cpl ? formatCurrency(camp.cpl) : "—", align: "right" as const },
      ];
      cells.forEach((cell) => {
        const c = ws4.getCell(r, cell.col);
        c.value = cell.val;
        c.font = { name: "Segoe UI", size: 9.5, bold: cell.bold || false, color: { argb: "FF0F172A" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        c.border = thinBorder;
        c.alignment = { horizontal: cell.align, vertical: "middle" };
        if (cell.isMoney && typeof cell.val === "number") {
          c.numFmt = "#,##0 \"đ\"";
        } else if (cell.isNum && typeof cell.val === "number") {
          c.numFmt = "#,##0";
        }
      });
      ws4.getRow(r).height = 21;
    });
  }

  // Section 2: TikTok Ads
  r += 2;
  ws4.mergeCells(`B${r}:H${r}`);
  const secH4b = ws4.getCell(`B${r}`);
  secH4b.value = "2. CHI TIẾT CHIẾN DỊCH TIKTOK ADS";
  secH4b.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  secH4b.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH4b.alignment = { vertical: "middle", indent: 1 };
  ws4.getRow(r).height = 24;

  r++;
  adsCols.forEach((col, idx) => {
    const c = ws4.getCell(r, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws4.getRow(r).height = 22;

  const ttCampaigns = ttAds?.campaigns || [];
  if (ttCampaigns.length === 0) {
    r++;
    ws4.mergeCells(`B${r}:H${r}`);
    const emptyC = ws4.getCell(`B${r}`);
    emptyC.value = "Không có chiến dịch TikTok Ads phát sinh trong kỳ.";
    emptyC.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF64748B" } };
    emptyC.alignment = { horizontal: "center", vertical: "middle" };
    emptyC.border = thinBorder;
    ws4.getRow(r).height = 22;
  } else {
    ttCampaigns.forEach((camp, idx) => {
      r++;
      const rowBg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
      const cells = [
        { col: 2, val: camp.name, align: "left" as const, bold: true },
        { col: 3, val: camp.branchName || "Tổng kho", align: "left" as const },
        { col: 4, val: camp.cost, align: "right" as const, isMoney: true },
        { col: 5, val: camp.leads, align: "right" as const, isNum: true },
        { col: 6, val: camp.consulted, align: "right" as const, isNum: true },
        { col: 7, val: camp.orders, align: "right" as const, isNum: true },
        { col: 8, val: camp.cpl ? formatCurrency(camp.cpl) : "—", align: "right" as const },
      ];
      cells.forEach((cell) => {
        const c = ws4.getCell(r, cell.col);
        c.value = cell.val;
        c.font = { name: "Segoe UI", size: 9.5, bold: cell.bold || false, color: { argb: "FF0F172A" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        c.border = thinBorder;
        c.alignment = { horizontal: cell.align, vertical: "middle" };
        if (cell.isMoney && typeof cell.val === "number") {
          c.numFmt = "#,##0 \"đ\"";
        } else if (cell.isNum && typeof cell.val === "number") {
          c.numFmt = "#,##0";
        }
      });
      ws4.getRow(r).height = 21;
    });
  }

  // Section 3: Đánh giá & Kiến nghị
  r += 2;
  ws4.mergeCells(`B${r}:H${r}`);
  const secH4c = ws4.getCell(`B${r}`);
  secH4c.value = "3. NHẬN XÉT, ĐÁNH GIÁ & KIẾN NGHỊ CỦA BỘ PHẬN MARKETING";
  secH4c.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  secH4c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH4c.alignment = { vertical: "middle", indent: 1 };
  ws4.getRow(r).height = 24;

  const evalItems = [
    { title: "A. Kết quả nổi bật / Điểm sáng:", content: evalData?.highlightedResults || "Hoàn thành các chỉ tiêu đăng bài định kỳ." },
    { title: "B. Tồn tại, hạn chế & Khó khăn:", content: evalData?.issuesAndDifficulties || "Cần tăng cường chuyển đổi leads sang cuộc gọi tư vấn sâu." },
    { title: "C. Đề xuất & Kiến nghị hành động:", content: evalData?.proposalsAndRecommendations || "Tập trung sản xuất video giới thiệu sản phẩm chủ lực." },
  ];

  evalItems.forEach((ev) => {
    r++;
    ws4.mergeCells(`B${r}:H${r}`);
    const hCell = ws4.getCell(`B${r}`);
    hCell.value = ev.title;
    hCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: NAVY } };
    hCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    hCell.border = thinBorder;
    ws4.getRow(r).height = 22;

    r++;
    ws4.mergeCells(`B${r}:H${r}`);
    const bodyCell = ws4.getCell(`B${r}`);
    bodyCell.value = ev.content;
    bodyCell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF334155" } };
    bodyCell.alignment = { vertical: "top", wrapText: true };
    bodyCell.border = thinBorder;
    ws4.getRow(r).height = 36;
  });

  // Action plan if available
  if (actionPlan.length > 0) {
    r += 2;
    ws4.mergeCells(`B${r}:H${r}`);
    const secH4d = ws4.getCell(`B${r}`);
    secH4d.value = "4. KẾ HOẠCH HÀNH ĐỘNG KỲ TIẾP THEO";
    secH4d.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    secH4d.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    secH4d.alignment = { vertical: "middle", indent: 1 };
    ws4.getRow(r).height = 24;

    r++;
    const planCols = ["Nội dung công việc", "Mục tiêu cụ thể", "Người phụ trách", "Thời hạn"];
    ws4.mergeCells(`B${r}:D${r}`);
    ws4.getCell(`B${r}`).value = planCols[0];
    ws4.getCell(`E${r}`).value = planCols[1];
    ws4.getCell(`F${r}`).value = planCols[2];
    ws4.mergeCells(`G${r}:H${r}`);
    ws4.getCell(`G${r}`).value = planCols[3];

    for (let c = 2; c <= 8; c++) {
      const cell = ws4.getCell(r, c);
      cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
      cell.border = thinBorder;
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
    ws4.getRow(r).height = 22;

    actionPlan.forEach((plan, idx) => {
      r++;
      const rowBg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
      ws4.mergeCells(`B${r}:D${r}`);
      ws4.getCell(`B${r}`).value = plan.task;
      ws4.getCell(`E${r}`).value = plan.target;
      ws4.getCell(`F${r}`).value = plan.assignee;
      ws4.mergeCells(`G${r}:H${r}`);
      ws4.getCell(`G${r}`).value = plan.deadline;

      for (let c = 2; c <= 8; c++) {
        const cell = ws4.getCell(r, c);
        cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF0F172A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.border = thinBorder;
        cell.alignment = { horizontal: c === 2 ? "left" : "center", vertical: "middle" };
      }
      ws4.getRow(r).height = 21;
    });
  }

  // ============================================================================
  // DOWNLOAD WORKBOOK
  // ============================================================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  // Xây dựng tên file báo cáo chuyên nghiệp chuẩn doanh nghiệp
  let periodPart = "";
  if (report.reportType === "weekly") {
    if (report.periodSpan && report.periodSpan > 1) {
      const endWeek = report.periodNumber + report.periodSpan - 1;
      periodPart = `Tuần ${report.periodNumber}-${endWeek} Năm ${report.year}`;
    } else {
      periodPart = `Tuần ${report.periodNumber} Năm ${report.year}`;
    }
  } else if (report.reportType === "monthly") {
    periodPart = `Tháng ${report.periodNumber} Năm ${report.year}`;
  } else {
    const startFmt = report.startDate ? report.startDate.split("-").reverse().join(".") : "";
    const endFmt = report.endDate ? report.endDate.split("-").reverse().join(".") : "";
    periodPart = startFmt && endFmt ? `${startFmt} - ${endFmt}` : `Năm ${report.year}`;
  }

  const branchPart =
    report.branchName && report.branchName !== "Toàn hệ thống"
      ? report.branchName
      : "Hatico Toàn Hệ Thống";

  // Định dạng chuẩn: Báo Cáo Chi Tiết Marketing - Tuần 41-42 Năm 2026 - Hatico Toàn Hệ Thống.xlsx
  const cleanTitle = `Báo Cáo Chi Tiết Marketing - ${periodPart} - ${branchPart}`
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  a.download = `${cleanTitle}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

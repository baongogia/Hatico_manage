import ExcelJS from "exceljs";
import {
  ExecutiveKPISummary,
  ChannelComparisonPoint,
  AdPerformancePoint,
  BranchPerformanceRow,
  MarketingFilter,
} from "./marketing-types";

const PRIMARY_COLOR = "FF0F2D59";
const BORDER_COLOR = "FFCBD5E1";
const HEADER_FILL = "FF0F2D59";
const SUBHEADER_FILL = "FFF1F5F9";
const ALT_ROW_FILL = "FFF8FAFC";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
};

function formatCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return new Intl.NumberFormat("vi-VN").format(val) + " đ";
}

function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0";
  return new Intl.NumberFormat("vi-VN").format(val);
}

export async function exportMarketingExecutiveExcel(data: {
  kpis: ExecutiveKPISummary;
  channelComparison: ChannelComparisonPoint[];
  adPerformance: AdPerformancePoint[];
  branchPerformance: BranchPerformanceRow[];
  filter: MarketingFilter;
  dateRangeDisplay: string;
}) {
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
    console.error("Could not load logo for export", e);
  }

  // ============================================================================
  // SHEET 1: TỔNG QUAN BAN GIÁM ĐỐC
  // ============================================================================
  const wsSummary = workbook.addWorksheet("Tổng quan Marketing", {
    views: [{ showGridLines: true }],
  });

  wsSummary.columns = [
    { width: 5 },  // A
    { width: 32 }, // B: Chỉ số
    { width: 18 }, // C: Kỳ này
    { width: 18 }, // D: Kỳ trước
    { width: 16 }, // E: % Thay đổi
    { width: 28 }, // F: Đánh giá / Ghi chú
  ];

  if (imageId !== undefined) {
    wsSummary.addImage(imageId, {
      tl: { col: 1, row: 1 },
      ext: { width: 130, height: 42 },
    });
  }

  // Title rows
  wsSummary.mergeCells("B2:F2");
  const titleCell = wsSummary.getCell("B2");
  titleCell.value = "BÁO CÁO HIỆU QUẢ MARKETING – HATICO GROUP";
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: PRIMARY_COLOR } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  wsSummary.mergeCells("B3:F3");
  const subTitleCell = wsSummary.getCell("B3");
  subTitleCell.value = `Khoảng thời gian: ${data.dateRangeDisplay} | Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`;
  subTitleCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF64748B" } };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };

  // KPI Section Header
  let rIdx = 5;
  wsSummary.mergeCells(`B${rIdx}:F${rIdx}`);
  const kpiHeader = wsSummary.getCell(`B${rIdx}`);
  kpiHeader.value = "I. 8 CHỈ SỐ KPI MARKETING CỐT LÕI";
  kpiHeader.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  kpiHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  kpiHeader.alignment = { vertical: "middle", indent: 1 };
  wsSummary.getRow(rIdx).height = 26;

  rIdx++;
  const colHeaders = ["Chỉ số hiệu quả", "Kỳ báo cáo", "Kỳ đối chiếu", "Biến động", "Ghi chú"];
  colHeaders.forEach((h, i) => {
    const c = wsSummary.getCell(rIdx, i + 2);
    c.value = h;
    c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.alignment = { horizontal: i >= 1 && i <= 3 ? "center" : "left", vertical: "middle" };
    c.border = thinBorder;
  });
  wsSummary.getRow(rIdx).height = 22;

  const { kpis } = data;
  const calcChange = (cur: number, prev: number) => {
    if (prev <= 0) return cur > 0 ? "+100%" : "0%";
    const diff = ((cur - prev) / prev) * 100;
    return `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`;
  };

  const kpiRows = [
    { label: "1. Tổng bài viết / video đã đăng", cur: formatNumber(kpis.totalContents), prev: formatNumber(kpis.prevTotalContents), change: calcChange(kpis.totalContents, kpis.prevTotalContents), note: "Sản lượng nội dung đa kênh" },
    { label: "2. Tổng lượt xem (Views)", cur: formatNumber(kpis.totalViews), prev: formatNumber(kpis.prevTotalViews), change: calcChange(kpis.totalViews, kpis.prevTotalViews), note: "Facebook, TikTok, YT, Website" },
    { label: "3. Tổng lượt tương tác", cur: formatNumber(kpis.totalInteractions), prev: formatNumber(kpis.prevTotalInteractions), change: calcChange(kpis.totalInteractions, kpis.prevTotalInteractions), note: "Like, comment, share" },
    { label: "4. Tổng khách hàng quan tâm", cur: formatNumber(kpis.totalLeads), prev: formatNumber(kpis.prevTotalLeads), change: calcChange(kpis.totalLeads, kpis.prevTotalLeads), note: "Đầu mối quan tâm thực tế" },
    { label: "5. Tổng khách hàng được tư vấn", cur: formatNumber(kpis.totalConsulted), prev: formatNumber(kpis.prevTotalConsulted), change: calcChange(kpis.totalConsulted, kpis.prevTotalConsulted), note: "Đã liên hệ trao đổi nhu cầu" },
    { label: "6. Tổng khách chuyển đổi", cur: formatNumber(kpis.totalConverted), prev: formatNumber(kpis.prevTotalConverted), change: calcChange(kpis.totalConverted, kpis.prevTotalConverted), note: "Tiềm năng cao / Báo giá" },
    { label: "7. Tổng số đơn hàng chốt thành công", cur: formatNumber(kpis.totalOrders), prev: formatNumber(kpis.prevTotalOrders), change: calcChange(kpis.totalOrders, kpis.prevTotalOrders), note: "Đơn chốt thành công" },
    { label: "8. Tổng chi phí quảng cáo", cur: formatCurrency(kpis.totalAdCost), prev: formatCurrency(kpis.prevTotalAdCost), change: calcChange(kpis.totalAdCost, kpis.prevTotalAdCost), note: "Facebook Ads & TikTok Ads" },
  ];

  kpiRows.forEach((item, idx) => {
    rIdx++;
    const row = wsSummary.getRow(rIdx);
    row.height = 20;
    const bg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";

    [item.label, item.cur, item.prev, item.change, item.note].forEach((val, cIdx) => {
      const cell = wsSummary.getCell(rIdx, cIdx + 2);
      cell.value = val;
      cell.font = { name: "Arial", size: 10, bold: cIdx === 1 || cIdx === 0 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.border = thinBorder;
      cell.alignment = {
        horizontal: cIdx >= 1 && cIdx <= 3 ? "center" : "left",
        vertical: "middle",
      };
      if (cIdx === 3) {
        cell.font = {
          name: "Arial",
          size: 10,
          bold: true,
          color: { argb: String(val).startsWith("+") ? "FF16A34A" : String(val).startsWith("-") ? "FFDC2626" : "FF475569" },
        };
      }
    });
  });

  // Section II: Kênh Marketing
  rIdx += 2;
  wsSummary.mergeCells(`B${rIdx}:F${rIdx}`);
  const chHeader = wsSummary.getCell(`B${rIdx}`);
  chHeader.value = "II. HIỆU QUẢ THEO TỪNG KÊNH MARKETING";
  chHeader.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  chHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  chHeader.alignment = { vertical: "middle", indent: 1 };
  wsSummary.getRow(rIdx).height = 26;

  rIdx++;
  ["Kênh Marketing", "Lượt xem", "Tương tác", "Khách quan tâm", "Đơn chốt"].forEach((h, i) => {
    const c = wsSummary.getCell(rIdx, i + 2);
    c.value = h;
    c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.alignment = { horizontal: i >= 1 ? "center" : "left", vertical: "middle" };
    c.border = thinBorder;
  });

  data.channelComparison.forEach((ch, idx) => {
    rIdx++;
    const bg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
    [ch.channel, formatNumber(ch.views), formatNumber(ch.interactions), formatNumber(ch.leads), formatNumber(ch.orders)].forEach((v, i) => {
      const c = wsSummary.getCell(rIdx, i + 2);
      c.value = v;
      c.font = { name: "Arial", size: 10, bold: i === 0 };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      c.border = thinBorder;
      c.alignment = { horizontal: i >= 1 ? "center" : "left", vertical: "middle" };
    });
  });

  // Section III: Hiệu quả Quảng cáo
  rIdx += 2;
  wsSummary.mergeCells(`B${rIdx}:F${rIdx}`);
  const adHeader = wsSummary.getCell(`B${rIdx}`);
  adHeader.value = "III. HIỆU QUẢ CHIẾN DỊCH QUẢNG CÁO (ADS)";
  adHeader.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  adHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  adHeader.alignment = { vertical: "middle", indent: 1 };
  wsSummary.getRow(rIdx).height = 26;

  rIdx++;
  ["Kênh quảng cáo", "Chi phí thực tế", "Khách quan tâm", "Đơn chốt", "CPL (Chi phí/Khách)"].forEach((h, i) => {
    const c = wsSummary.getCell(rIdx, i + 2);
    c.value = h;
    c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.alignment = { horizontal: i >= 1 ? "center" : "left", vertical: "middle" };
    c.border = thinBorder;
  });

  data.adPerformance.forEach((ad, idx) => {
    rIdx++;
    const bg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
    [ad.channel, formatCurrency(ad.cost), formatNumber(ad.leads), formatNumber(ad.orders), ad.cpl ? formatCurrency(ad.cpl) : "—"].forEach((v, i) => {
      const c = wsSummary.getCell(rIdx, i + 2);
      c.value = v;
      c.font = { name: "Arial", size: 10, bold: i === 0 };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      c.border = thinBorder;
      c.alignment = { horizontal: i >= 1 ? "center" : "left", vertical: "middle" };
    });
  });

  // ============================================================================
  // SHEET 2: BÁO CÁO THEO CHI NHÁNH
  // ============================================================================
  const wsBranch = workbook.addWorksheet("Báo cáo theo chi nhánh", {
    views: [{ showGridLines: true }],
  });

  wsBranch.columns = [
    { width: 5 },  // A
    { width: 28 }, // B: Chi nhánh
    { width: 15 }, // C: Nội dung
    { width: 16 }, // D: Khách quan tâm (Nguồn)
    { width: 16 }, // E: Đã tư vấn
    { width: 16 }, // F: Chuyển đổi
    { width: 14 }, // G: Đơn chốt
    { width: 20 }, // H: Chi phí Ads
    { width: 18 }, // I: Khách tiếp nhận
    { width: 16 }, // J: Đơn tiếp nhận
  ];

  wsBranch.mergeCells("B2:J2");
  const bTitle = wsBranch.getCell("B2");
  bTitle.value = "TỔNG HỢP HIỆU QUẢ MARKETING THEO CHI NHÁNH";
  bTitle.font = { name: "Arial", size: 13, bold: true, color: { argb: PRIMARY_COLOR } };
  bTitle.alignment = { horizontal: "center", vertical: "middle" };

  let bRow = 4;
  const bHeaders = [
    "Chi nhánh",
    "Nội dung đăng",
    "Khách nguồn",
    "Đã tư vấn",
    "Chuyển đổi",
    "Đơn chốt",
    "Chi phí Ads",
    "Khách tiếp nhận",
    "Đơn tiếp nhận",
  ];

  bHeaders.forEach((h, i) => {
    const c = wsBranch.getCell(bRow, i + 2);
    c.value = h;
    c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    c.alignment = { horizontal: i === 0 ? "left" : "center", vertical: "middle" };
    c.border = thinBorder;
  });
  wsBranch.getRow(bRow).height = 24;

  data.branchPerformance.forEach((bp, idx) => {
    bRow++;
    const bg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
    const rowValues = [
      bp.branchName,
      formatNumber(bp.contentsCount),
      formatNumber(bp.leadsCount),
      formatNumber(bp.consultedCount),
      formatNumber(bp.convertedCount),
      formatNumber(bp.ordersCount),
      formatCurrency(bp.adCost),
      formatNumber(bp.handledLeadsCount),
      formatNumber(bp.handledOrdersCount),
    ];

    rowValues.forEach((v, i) => {
      const c = wsBranch.getCell(bRow, i + 2);
      c.value = v;
      c.font = { name: "Arial", size: 10, bold: i === 0 };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      c.border = thinBorder;
      c.alignment = { horizontal: i === 0 ? "left" : "center", vertical: "middle" };
    });
  });

  // Generate and download Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanDate = new Date().toISOString().split("T")[0];
  a.download = `Bao_cao_tong_quan_Marketing_Hatico_${cleanDate}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

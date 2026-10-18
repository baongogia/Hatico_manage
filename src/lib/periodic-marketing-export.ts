import ExcelJS from "exceljs";
import { MarketingPeriodicReport } from "./periodic-marketing-types";
import { HATICO_BRANCHES, isPostInBranch, getBranchPIC } from "./marketing-types";

const NAVY = "FF0F2D59";
const NAVY_LIGHT = "FF1E3A8A";
const BORDER_COLOR = "FFCBD5E1";
const HEADER_FILL = "FF0F2D59";
const SUBHEADER_FILL = "FFF1F5F9";
const ALT_ROW_FILL = "FFF8FAFC";
const TOTAL_ROW_FILL = "FFE2E8F0";
const ACCENT_GREEN = "FF059669";
const ACCENT_RED = "FFE11D48";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
};

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

  // Load logo - Hatico Logo (Original: 1944 x 809 => Tỷ lệ chuẩn 2.403 : 1)
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
  const channelResults = report.data.channelResults || [];
  const channelTotals = report.data.channelTotals;
  const branchResults = report.data.branchResults || [];
  const totalSystemBranch = report.data.totalSystemBranch;
  const rawTopContents = report.data.topContents || [];
  const topContents: typeof rawTopContents = [];
  rawTopContents.forEach((p) => {
    if (p.platform && p.platform.includes(",")) {
      const parts = p.platform.split(",").map((s) => s.trim()).filter(Boolean);
      parts.forEach((part) => {
        const lower = part.toLowerCase();
        const pKey = lower.includes("tiktok")
          ? "tiktok"
          : lower.includes("youtube")
          ? "youtube"
          : lower.includes("website")
          ? "website"
          : "facebook";
        topContents.push({
          ...p,
          id: `${p.id}_${pKey}`,
          platform: part,
          platformKey: pKey,
        });
      });
    } else {
      topContents.push(p);
    }
  });

  const fbAds = report.data.facebookAds;
  const ttAds = report.data.tiktokAds;
  const evalData = report.evaluation;
  const actionPlan = report.actionPlan || [];

  const periodTitle = report.periodLabel || (
    report.reportType === "weekly"
      ? `TUẦN ${report.periodNumber} / ${report.year}`
      : `THÁNG ${report.periodNumber} / ${report.year}`
  );

  // Helper hàm tạo Header chuẩn doanh nghiệp cho mọi Sheet (Logo đúng tỷ lệ 2.4:1, không nén dọc)
  const renderSheetHeader = (
    ws: ExcelJS.Worksheet,
    title: string,
    endColLetter: string
  ) => {
    ws.getRow(1).height = 10;
    ws.getRow(2).height = 28;
    ws.getRow(3).height = 22;
    ws.getRow(4).height = 20;
    ws.getRow(5).height = 12;

    // Khung chứa Logo bên trái: Merge B2:B4
    ws.mergeCells("B2:B4");
    const logoBox = ws.getCell("B2");
    logoBox.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    logoBox.border = thinBorder;
    logoBox.alignment = { horizontal: "center", vertical: "middle" };

    if (imageId !== undefined) {
      // 173px x 72px => Tỷ lệ 2.403:1 hoàn hảo, không bị dẹt theo chiều dọc
      ws.addImage(imageId, {
        tl: { col: 1.08, row: 1.15 },
        ext: { width: 173, height: 72 },
        editAs: "undefined",
      });
    }

    // Tiêu đề báo cáo
    ws.mergeCells(`C2:${endColLetter}2`);
    const tCell = ws.getCell("C2");
    tCell.value = title;
    tCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: NAVY } };
    tCell.alignment = { horizontal: "center", vertical: "middle" };

    // Phụ đề thời gian & phạm vi
    ws.mergeCells(`C3:${endColLetter}3`);
    const sCell = ws.getCell("C3");
    sCell.value = `Thời gian: ${formatDate(report.startDate)} – ${formatDate(report.endDate)}   |   Phạm vi: ${report.branchName}   |   Trạng thái: ${report.status === "closed" ? "ĐÃ CHỐT" : "BẢN NHÁP"}`;
    sCell.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF475569" } };
    sCell.alignment = { horizontal: "center", vertical: "middle" };

    // Metadata người lập
    ws.mergeCells(`C4:${endColLetter}4`);
    const mCell = ws.getCell("C4");
    mCell.value = `Người lập: ${report.creatorName} ${report.closedBy ? `  |  Chốt bởi: ${report.closedBy}` : ""}   |   Xuất file: ${new Date().toLocaleString("vi-VN")}`;
    mCell.font = { name: "Segoe UI", size: 9, color: { argb: "FF64748B" } };
    mCell.alignment = { horizontal: "center", vertical: "middle" };
  };

  // Chiết xuất số liệu các nền tảng (Facebook, TikTok, YouTube, Website)
  const fbCh = channelResults.find((c) => c.platform === "facebook") || {
    contentCount: 0, views: 0, interactions: 0, leads: 0, consulted: 0, converted: 0, orders: 0,
  };
  const ttCh = channelResults.find((c) => c.platform === "tiktok") || {
    contentCount: 0, views: 0, interactions: 0, leads: 0, consulted: 0, converted: 0, orders: 0,
  };
  const ytCh = channelResults.find((c) => c.platform === "youtube") || {
    contentCount: 0, views: 0, interactions: 0, leads: 0, consulted: 0, converted: 0, orders: 0,
  };
  const wsCh = channelResults.find((c) => c.platform === "website") || {
    contentCount: 0, views: 0, interactions: null, leads: 0, consulted: 0, converted: 0, orders: 0,
  };

  const prevChannels = (report.data as any).prevChannelResults as typeof channelResults | undefined;
  const prevFb = prevChannels?.find((c) => c.platform === "facebook");
  const prevTt = prevChannels?.find((c) => c.platform === "tiktok");
  const prevYt = prevChannels?.find((c) => c.platform === "youtube");
  const prevWs = prevChannels?.find((c) => c.platform === "website");

  // ============================================================================
  // TAB 1: 📊 TỔNG QUAN & KPIS CỐT LÕI (TÁCH TỪNG DÒNG NỀN TẢNG & CÔNG THỨC EXCEL)
  // ============================================================================
  const ws1 = workbook.addWorksheet("Tổng quan & KPIs", {
    views: [{ showGridLines: true }],
  });

  ws1.columns = [
    { width: 4 },  // A: Spacer
    { width: 44 }, // B: Chỉ số hiệu quả / Nền tảng
    { width: 20 }, // C: Kỳ báo cáo này
    { width: 20 }, // D: Kỳ đối chiếu
    { width: 16 }, // E: Chênh lệch
    { width: 16 }, // F: % Biến động
    { width: 28 }, // G: Nhận định / Đánh giá
  ];

  renderSheetHeader(ws1, `BÁO CÁO MARKETING ${periodTitle.toUpperCase()}`, "G");

  // PHẦN I: KPI CỐT LÕI THEO NỀN TẢNG
  let r = 6;
  ws1.mergeCells(`B${r}:G${r}`);
  const secH1 = ws1.getCell(`B${r}`);
  secH1.value = "PHẦN I. CHỈ SỐ KPI MARKETING CHI TIẾT THEO NỀN TẢNG & TOÀN HỆ THỐNG";
  secH1.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  secH1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH1.alignment = { vertical: "middle", indent: 1 };
  ws1.getRow(r).height = 25;

  r++;
  const kpiCols = [
    "Chỉ số hiệu quả & Nền tảng",
    "Kỳ báo cáo này",
    "Kỳ đối chiếu",
    "Chênh lệch",
    "% Tăng/Giảm",
    "Nhận định",
  ];
  kpiCols.forEach((col, idx) => {
    const c = ws1.getCell(r, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: idx >= 1 && idx <= 4 ? "center" : "left", vertical: "middle" };
  });
  ws1.getRow(r).height = 23;

  // Định nghĩa các dòng dữ liệu để xuất công thức Excel tương tác
  // Hàng 8..12: Nội dung đăng (Tổng = C9:C12)
  // Hàng 13..17: Lượt xem / Truy cập (Tổng = C14:C17)
  // Hàng 18..22: Tương tác (Tổng = C19:C22)
  // Hàng 23..26: Leads (Tổng = C24:C26)
  // Hàng 27: Khách tư vấn
  // Hàng 28: Khách chuyển đổi
  // Hàng 29: Đơn hàng chốt
  // Hàng 30..33: Chi phí Ads (Tổng = C31:C33)

  const r_post_tot = 8;
  const r_post_fb = 9;
  const r_post_tt = 10;
  const r_post_yt = 11;
  const r_post_web = 12;

  const r_view_tot = 13;
  const r_view_fb = 14;
  const r_view_tt = 15;
  const r_view_yt = 16;
  const r_view_web = 17;

  const r_inter_tot = 18;
  const r_inter_fb = 19;
  const r_inter_tt = 20;
  const r_inter_yt = 21;
  const r_inter_web = 22;

  const r_lead_tot = 23;
  const r_lead_fb = 24;
  const r_lead_tt = 25;
  const r_lead_web = 26;

  const r_consult = 27;
  const r_convert = 28;
  const r_order = 29;

  const r_ad_tot = 30;
  const r_ad_fb = 31;
  const r_ad_tt = 32;
  const r_ad_oth = 33;

  interface ExportRowSpec {
    rowNum: number;
    label: string;
    isGroupHeader: boolean;
    indent: number;
    isMoney?: boolean;
    curVal: number | { formula: string; result: number };
    prevVal: number | { formula: string; result: number };
    isCostDiff?: boolean;
  }

  const kpiRowSpecs: ExportRowSpec[] = [
    // 1. SẢN LƯỢNG NỘI DUNG ĐÃ ĐĂNG
    {
      rowNum: r_post_tot,
      label: "1. Tổng nội dung đăng toàn hệ thống (bài viết / video)",
      isGroupHeader: true,
      indent: 0,
      curVal: { formula: `SUM(C${r_post_fb}:C${r_post_web})`, result: kpis.totalContents },
      prevVal: { formula: `SUM(D${r_post_fb}:D${r_post_web})`, result: prevKpis?.totalContents ?? 0 },
    },
    {
      rowNum: r_post_fb,
      label: "  • Facebook (Bài viết, hình ảnh, Reels)",
      isGroupHeader: false,
      indent: 1,
      curVal: fbCh.contentCount,
      prevVal: prevFb?.contentCount ?? 0,
    },
    {
      rowNum: r_post_tt,
      label: "  • TikTok (Video ngắn)",
      isGroupHeader: false,
      indent: 1,
      curVal: ttCh.contentCount,
      prevVal: prevTt?.contentCount ?? 0,
    },
    {
      rowNum: r_post_yt,
      label: "  • YouTube (Video dài & Shorts)",
      isGroupHeader: false,
      indent: 1,
      curVal: ytCh.contentCount,
      prevVal: prevYt?.contentCount ?? 0,
    },
    {
      rowNum: r_post_web,
      label: "  • Website (Bài viết chuẩn SEO / Tin tức)",
      isGroupHeader: false,
      indent: 1,
      curVal: wsCh.contentCount,
      prevVal: prevWs?.contentCount ?? 0,
    },

    // 2. LƯỢT XEM & TIẾP CẬN NỘI DUNG (TÁCH BIỆT TỪNG NỀN TẢNG, WEBSITE = TRAFFIC/XEM TRANG)
    {
      rowNum: r_view_tot,
      label: "2. Tổng lượt xem & tiếp cận nội dung (Toàn hệ thống)",
      isGroupHeader: true,
      indent: 0,
      curVal: { formula: `SUM(C${r_view_fb}:C${r_view_web})`, result: channelTotals.views || kpis.totalViews },
      prevVal: { formula: `SUM(D${r_view_fb}:D${r_view_web})`, result: prevKpis?.totalViews ?? 0 },
    },
    {
      rowNum: r_view_fb,
      label: "  • Facebook: Lượt tiếp cận / xem (Reach / Views)",
      isGroupHeader: false,
      indent: 1,
      curVal: fbCh.views,
      prevVal: prevFb?.views ?? 0,
    },
    {
      rowNum: r_view_tt,
      label: "  • TikTok: Lượt xem video (Video Views)",
      isGroupHeader: false,
      indent: 1,
      curVal: ttCh.views,
      prevVal: prevTt?.views ?? 0,
    },
    {
      rowNum: r_view_yt,
      label: "  • YouTube: Lượt xem (Video & Shorts Views)",
      isGroupHeader: false,
      indent: 1,
      curVal: ytCh.views,
      prevVal: prevYt?.views ?? 0,
    },
    {
      rowNum: r_view_web,
      label: "  • Website: Lượt truy cập / xem trang (Traffic / Pageviews)",
      isGroupHeader: false,
      indent: 1,
      curVal: wsCh.views,
      prevVal: prevWs?.views ?? 0,
    },

    // 3. LƯỢT TƯƠNG TÁC MẠNG XÃ HỘI
    {
      rowNum: r_inter_tot,
      label: "3. Tổng lượt tương tác mạng xã hội (Likes/Comments/Shares)",
      isGroupHeader: true,
      indent: 0,
      curVal: { formula: `SUM(C${r_inter_fb}:C${r_inter_web})`, result: channelTotals.interactions || kpis.totalInteractions },
      prevVal: { formula: `SUM(D${r_inter_fb}:D${r_inter_web})`, result: prevKpis?.totalInteractions ?? 0 },
    },
    {
      rowNum: r_inter_fb,
      label: "  • Facebook: Tương tác (Likes, Comments, Shares)",
      isGroupHeader: false,
      indent: 1,
      curVal: fbCh.interactions || 0,
      prevVal: prevFb?.interactions ?? 0,
    },
    {
      rowNum: r_inter_tt,
      label: "  • TikTok: Tương tác (Tim, Bình luận, Chia sẻ, Lưu)",
      isGroupHeader: false,
      indent: 1,
      curVal: ttCh.interactions || 0,
      prevVal: prevTt?.interactions ?? 0,
    },
    {
      rowNum: r_inter_yt,
      label: "  • YouTube: Tương tác (Likes, Bình luận)",
      isGroupHeader: false,
      indent: 1,
      curVal: ytCh.interactions || 0,
      prevVal: prevYt?.interactions ?? 0,
    },
    {
      rowNum: r_inter_web,
      label: "  • Website: Tương tác & liên hệ (Click Hotline, Zalo, Form)",
      isGroupHeader: false,
      indent: 1,
      curVal: 0,
      prevVal: 0,
    },

    // 4. KHÁCH HÀNG & PHỄU CHUYỂN ĐỔI
    {
      rowNum: r_lead_tot,
      label: "4. Tổng khách hàng quan tâm (Leads toàn hệ thống)",
      isGroupHeader: true,
      indent: 0,
      curVal: { formula: `SUM(C${r_lead_fb}:C${r_lead_web})`, result: kpis.totalLeads },
      prevVal: { formula: `SUM(D${r_lead_fb}:D${r_lead_web})`, result: prevKpis?.totalLeads ?? 0 },
    },
    {
      rowNum: r_lead_fb,
      label: "  • Khách từ Facebook (Organic + Facebook Ads)",
      isGroupHeader: false,
      indent: 1,
      curVal: fbCh.leads,
      prevVal: prevFb?.leads ?? 0,
    },
    {
      rowNum: r_lead_tt,
      label: "  • Khách từ TikTok (Organic + TikTok Ads)",
      isGroupHeader: false,
      indent: 1,
      curVal: ttCh.leads,
      prevVal: prevTt?.leads ?? 0,
    },
    {
      rowNum: r_lead_web,
      label: "  • Khách từ Website & Kênh khác (Hotline, Zalo, YouTube)",
      isGroupHeader: false,
      indent: 1,
      curVal: (wsCh.leads || 0) + (ytCh.leads || 0),
      prevVal: (prevWs?.leads ?? 0) + (prevYt?.leads ?? 0),
    },
    {
      rowNum: r_consult,
      label: "5. Khách hàng được liên hệ tư vấn (Consulted)",
      isGroupHeader: true,
      indent: 0,
      curVal: kpis.totalConsulted,
      prevVal: prevKpis?.totalConsulted ?? 0,
    },
    {
      rowNum: r_convert,
      label: "6. Khách hàng tiềm năng chuyển đổi thực tế (Converted)",
      isGroupHeader: true,
      indent: 0,
      curVal: kpis.totalConverted,
      prevVal: prevKpis?.totalConverted ?? 0,
    },
    {
      rowNum: r_order,
      label: "7. Đơn hàng chốt thành công (Orders / Deals)",
      isGroupHeader: true,
      indent: 0,
      curVal: kpis.totalOrders,
      prevVal: prevKpis?.totalOrders ?? 0,
    },

    // 5. CHI PHÍ QUẢNG CÁO
    {
      rowNum: r_ad_tot,
      label: "8. Tổng chi phí quảng cáo (Toàn hệ thống)",
      isGroupHeader: true,
      indent: 0,
      isMoney: true,
      curVal: { formula: `SUM(C${r_ad_fb}:C${r_ad_oth})`, result: kpis.totalAdSpend },
      prevVal: { formula: `SUM(D${r_ad_fb}:D${r_ad_oth})`, result: prevKpis?.totalAdSpend ?? 0 },
      isCostDiff: true,
    },
    {
      rowNum: r_ad_fb,
      label: "  • Chi phí Facebook Ads",
      isGroupHeader: false,
      indent: 1,
      isMoney: true,
      curVal: fbAds?.totalCost || 0,
      prevVal: 0,
      isCostDiff: true,
    },
    {
      rowNum: r_ad_tt,
      label: "  • Chi phí TikTok Ads",
      isGroupHeader: false,
      indent: 1,
      isMoney: true,
      curVal: ttAds?.totalCost || 0,
      prevVal: 0,
      isCostDiff: true,
    },
    {
      rowNum: r_ad_oth,
      label: "  • Chi phí quảng cáo kênh khác (Google, Zalo... - nhập tay)",
      isGroupHeader: false,
      indent: 1,
      isMoney: true,
      curVal: 0,
      prevVal: 0,
      isCostDiff: true,
    },
  ];

  kpiRowSpecs.forEach((spec, idx) => {
    const rowIdx = spec.rowNum;
    const curNumeric = typeof spec.curVal === "object" ? spec.curVal.result : spec.curVal;
    const prevNumeric = typeof spec.prevVal === "object" ? spec.prevVal.result : spec.prevVal;
    const diffNumeric = curNumeric - prevNumeric;
    const pctNumeric = prevNumeric > 0 ? diffNumeric / prevNumeric : (curNumeric > 0 ? 1 : 0);

    const isGroup = spec.isGroupHeader;
    const rowBg = isGroup ? SUBHEADER_FILL : (idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF");
    const textColor = isGroup ? "FF0F172A" : "FF1E293B";

    // Cột B: Tên chỉ số
    const cB = ws1.getCell(rowIdx, 2);
    cB.value = spec.label;
    cB.font = { name: "Segoe UI", size: 9.5, bold: isGroup, color: { argb: textColor } };
    cB.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    cB.border = thinBorder;
    cB.alignment = { horizontal: "left", vertical: "middle", indent: spec.indent };

    // Cột C: Kỳ này
    const cC = ws1.getCell(rowIdx, 3);
    cC.value = spec.curVal;
    cC.font = { name: "Segoe UI", size: 9.5, bold: isGroup, color: { argb: textColor } };
    cC.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    cC.border = thinBorder;
    cC.alignment = { horizontal: "right", vertical: "middle" };
    cC.numFmt = spec.isMoney ? '#,##0 "đ"' : "#,##0";

    // Cột D: Kỳ trước
    const cD = ws1.getCell(rowIdx, 4);
    cD.value = spec.prevVal;
    cD.font = { name: "Segoe UI", size: 9.5, bold: false, color: { argb: "FF64748B" } };
    cD.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    cD.border = thinBorder;
    cD.alignment = { horizontal: "right", vertical: "middle" };
    cD.numFmt = spec.isMoney ? '#,##0 "đ"' : "#,##0";

    // Cột E: Chênh lệch (=C - D)
    const cE = ws1.getCell(rowIdx, 5);
    cE.value = {
      formula: `C${rowIdx}-D${rowIdx}`,
      result: diffNumeric,
    };
    cE.font = { name: "Segoe UI", size: 9.5, bold: false, color: { argb: "FF334155" } };
    cE.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    cE.border = thinBorder;
    cE.alignment = { horizontal: "right", vertical: "middle" };
    cE.numFmt = spec.isMoney ? '+#,##0 "đ";-#,##0 "đ";0 "đ"' : "+#,##0;-#,##0;0";

    // Cột F: % Tăng/Giảm (=IF(D>0, (C-D)/D, IF(C>0, 1, 0)))
    const cF = ws1.getCell(rowIdx, 6);
    cF.value = {
      formula: `IF(D${rowIdx}>0,(C${rowIdx}-D${rowIdx})/D${rowIdx},IF(C${rowIdx}>0,1,0))`,
      result: pctNumeric,
    };
    const pctColor = pctNumeric > 0 ? (spec.isCostDiff ? ACCENT_RED : ACCENT_GREEN) : (pctNumeric < 0 ? (spec.isCostDiff ? ACCENT_GREEN : ACCENT_RED) : "FF334155");
    cF.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: pctColor } };
    cF.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    cF.border = thinBorder;
    cF.alignment = { horizontal: "center", vertical: "middle" };
    cF.numFmt = "+0.0%;-0.0%;0.0%";

    // Cột G: Nhận định tự động
    const cG = ws1.getCell(rowIdx, 7);
    let noteResult = "Ổn định";
    if (spec.isCostDiff) {
      noteResult = pctNumeric > 0.1 ? "Chi phí tăng" : (pctNumeric < -0.1 ? "Tiết kiệm chi phí" : "Ổn định");
      cG.value = {
        formula: `IF(F${rowIdx}>0.1,"Chi phí tăng",IF(F${rowIdx}<-0.1,"Tiết kiệm chi phí","Ổn định"))`,
        result: noteResult,
      };
    } else {
      noteResult = pctNumeric > 0.1 ? "Tăng trưởng tốt" : (pctNumeric < -0.1 ? "Cần cải thiện" : "Ổn định");
      cG.value = {
        formula: `IF(F${rowIdx}>0.1,"Tăng trưởng tốt",IF(F${rowIdx}<-0.1,"Cần cải thiện","Ổn định"))`,
        result: noteResult,
      };
    }
    cG.font = { name: "Segoe UI", size: 9.5, bold: false, color: { argb: "FF475569" } };
    cG.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    cG.border = thinBorder;
    cG.alignment = { horizontal: "left", vertical: "middle" };

    ws1.getRow(rowIdx).height = isGroup ? 22 : 21;
  });

  // PHẦN II. HIỆU QUẢ CHUYỂN ĐỔI PHỄU MARKETING & CHI PHÍ
  let rFunnel = r_ad_oth + 2;
  ws1.mergeCells(`B${rFunnel}:G${rFunnel}`);
  const secH1b = ws1.getCell(`B${rFunnel}`);
  secH1b.value = "PHẦN II. HIỆU QUẢ CHUYỂN ĐỔI PHỄU MARKETING & CHI PHÍ";
  secH1b.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  secH1b.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH1b.alignment = { vertical: "middle", indent: 1 };
  ws1.getRow(rFunnel).height = 25;

  rFunnel++;
  const funnelCols = [
    "Chỉ số chuyển đổi & Đơn giá",
    "Kỳ báo cáo này",
    "Công thức / Đơn vị",
    "Kỳ đối chiếu",
    "% Biến động",
    "Đánh giá hiệu quả",
  ];
  funnelCols.forEach((col, idx) => {
    const c = ws1.getCell(rFunnel, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: idx >= 1 && idx <= 4 ? "center" : "left", vertical: "middle" };
  });
  ws1.getRow(rFunnel).height = 23;

  const prevTotalLeads = prevKpis?.totalLeads ?? 0;
  const prevTotalConsulted = prevKpis?.totalConsulted ?? 0;
  const prevTotalOrders = prevKpis?.totalOrders ?? 0;
  const prevTotalAdSpend = prevKpis?.totalAdSpend ?? 0;

  const funnelSpecs = [
    {
      name: "Tỷ lệ chốt đơn trên Lead (Orders / Leads)",
      formulaCur: `IF(C${r_lead_tot}>0, C${r_order}/C${r_lead_tot}, 0)`,
      valCur: kpis.totalLeads > 0 ? kpis.totalOrders / kpis.totalLeads : 0,
      unit: "Đơn chốt / Tổng Leads",
      formulaPrev: `IF(D${r_lead_tot}>0, D${r_order}/D${r_lead_tot}, 0)`,
      valPrev: prevTotalLeads > 0 ? prevTotalOrders / prevTotalLeads : 0,
      isMoney: false,
      isPercent: true,
      noteFormula: (row: number) => `IF(C${row}>=0.08,"Hiệu quả sales tốt (>=8%)",IF(C${row}>0,"Đang tối ưu chốt","Chưa có đơn chốt"))`,
      noteResult: kpis.totalLeads > 0 && kpis.totalOrders / kpis.totalLeads >= 0.08 ? "Hiệu quả sales tốt (>=8%)" : "Đang tối ưu chốt",
    },
    {
      name: "Tỷ lệ tiếp cận tư vấn (Consulted / Leads)",
      formulaCur: `IF(C${r_lead_tot}>0, C${r_consult}/C${r_lead_tot}, 0)`,
      valCur: kpis.totalLeads > 0 ? kpis.totalConsulted / kpis.totalLeads : 0,
      unit: "Được tư vấn / Tổng Leads",
      formulaPrev: `IF(D${r_lead_tot}>0, D${r_consult}/D${r_lead_tot}, 0)`,
      valPrev: prevTotalLeads > 0 ? prevTotalConsulted / prevTotalLeads : 0,
      isMoney: false,
      isPercent: true,
      noteFormula: (row: number) => `IF(C${row}>=0.7,"Tốc độ chăm sóc đạt chuẩn (>=70%)","Cần đẩy nhanh gọi tư vấn")`,
      noteResult: kpis.totalLeads > 0 && kpis.totalConsulted / kpis.totalLeads >= 0.7 ? "Tốc độ chăm sóc đạt chuẩn (>=70%)" : "Cần đẩy nhanh gọi tư vấn",
    },
    {
      name: "Tỷ lệ chuyển đổi sau tư vấn (Converted / Consulted)",
      formulaCur: `IF(C${r_consult}>0, C${r_convert}/C${r_consult}, 0)`,
      valCur: kpis.totalConsulted > 0 ? kpis.totalConverted / kpis.totalConsulted : 0,
      unit: "Chuyển đổi thực tế / Được tư vấn",
      formulaPrev: `IF(D${r_consult}>0, D${r_convert}/D${r_consult}, 0)`,
      valPrev: prevTotalConsulted > 0 ? (prevKpis?.totalConverted ?? 0) / prevTotalConsulted : 0,
      isMoney: false,
      isPercent: true,
      noteFormula: (row: number) => `IF(C${row}>=0.3,"Chất lượng tư vấn tốt (>=30%)","Cần cải thiện kịch bản telesale")`,
      noteResult: kpis.totalConsulted > 0 && kpis.totalConverted / kpis.totalConsulted >= 0.3 ? "Chất lượng tư vấn tốt (>=30%)" : "Cần cải thiện kịch bản telesale",
    },
    {
      name: "Chi phí trung bình trên 1 Lead (CPL)",
      formulaCur: `IF(C${r_lead_tot}>0, C${r_ad_tot}/C${r_lead_tot}, 0)`,
      valCur: kpis.totalLeads > 0 ? Math.round(kpis.totalAdSpend / kpis.totalLeads) : 0,
      unit: "Tổng chi phí Ads / Tổng Leads",
      formulaPrev: `IF(D${r_lead_tot}>0, D${r_ad_tot}/D${r_lead_tot}, 0)`,
      valPrev: prevTotalLeads > 0 ? Math.round(prevTotalAdSpend / prevTotalLeads) : 0,
      isMoney: true,
      isPercent: false,
      noteFormula: (row: number) => `IF(C${row}>0,"Chi phí thu hút lead","Chưa phát sinh chi phí")`,
      noteResult: kpis.totalAdSpend > 0 ? "Chi phí thu hút lead" : "Chưa phát sinh chi phí",
    },
    {
      name: "Chi phí trung bình trên 1 Đơn chốt (CPO)",
      formulaCur: `IF(C${r_order}>0, C${r_ad_tot}/C${r_order}, 0)`,
      valCur: kpis.totalOrders > 0 ? Math.round(kpis.totalAdSpend / kpis.totalOrders) : 0,
      unit: "Tổng chi phí Ads / Tổng Đơn chốt",
      formulaPrev: `IF(D${r_order}>0, D${r_ad_tot}/D${r_order}, 0)`,
      valPrev: prevTotalOrders > 0 ? Math.round(prevTotalAdSpend / prevTotalOrders) : 0,
      isMoney: true,
      isPercent: false,
      noteFormula: (row: number) => `IF(C${row}>0,"Giá vốn marketing / xe","Chưa có đơn chốt từ Ads")`,
      noteResult: kpis.totalAdSpend > 0 ? "Giá vốn marketing / xe" : "Chưa có đơn chốt từ Ads",
    },
  ];

  funnelSpecs.forEach((fRow, i) => {
    rFunnel++;
    const rowBg = i % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
    const curVal = fRow.valCur;
    const prevVal = fRow.valPrev;
    const diffPct = prevVal > 0 ? (curVal - prevVal) / prevVal : (curVal > 0 ? 1 : 0);

    // Cột B: Tên chỉ số
    const cB = ws1.getCell(rFunnel, 2);
    cB.value = fRow.name;
    cB.font = { name: "Segoe UI", size: 9.5, bold: false, color: { argb: "FF0F172A" } };
    cB.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    cB.border = thinBorder;
    cB.alignment = { horizontal: "left", vertical: "middle" };

    // Cột C: Kỳ này
    const cC = ws1.getCell(rFunnel, 3);
    cC.value = { formula: fRow.formulaCur, result: curVal };
    cC.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF0F172A" } };
    cC.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    cC.border = thinBorder;
    cC.alignment = { horizontal: "right", vertical: "middle" };
    cC.numFmt = fRow.isMoney ? '#,##0 "đ"' : "0.0%";

    // Cột D: Công thức / Đơn vị
    const cD = ws1.getCell(rFunnel, 4);
    cD.value = fRow.unit;
    cD.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF64748B" } };
    cD.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    cD.border = thinBorder;
    cD.alignment = { horizontal: "center", vertical: "middle" };

    // Cột E: Kỳ trước
    const cE = ws1.getCell(rFunnel, 5);
    cE.value = { formula: fRow.formulaPrev, result: prevVal };
    cE.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF64748B" } };
    cE.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    cE.border = thinBorder;
    cE.alignment = { horizontal: "right", vertical: "middle" };
    cE.numFmt = fRow.isMoney ? '#,##0 "đ"' : "0.0%";

    // Cột F: % Biến động (=IF(E>0, (C-E)/E, IF(C>0, 1, 0)))
    const cF = ws1.getCell(rFunnel, 6);
    cF.value = {
      formula: `IF(E${rFunnel}>0,(C${rFunnel}-E${rFunnel})/E${rFunnel},IF(C${rFunnel}>0,1,0))`,
      result: diffPct,
    };
    cF.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: diffPct > 0 ? ACCENT_GREEN : (diffPct < 0 ? ACCENT_RED : "FF64748B") } };
    cF.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    cF.border = thinBorder;
    cF.alignment = { horizontal: "center", vertical: "middle" };
    cF.numFmt = "+0.0%;-0.0%;0.0%";

    // Cột G: Đánh giá
    const cG = ws1.getCell(rFunnel, 7);
    cG.value = {
      formula: fRow.noteFormula(rFunnel),
      result: fRow.noteResult,
    };
    cG.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF475569" } };
    cG.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    cG.border = thinBorder;
    cG.alignment = { horizontal: "left", vertical: "middle" };

    ws1.getRow(rFunnel).height = 21;
  });

  // Khung hướng dẫn nhập tay & công thức tự động
  rFunnel += 2;
  ws1.mergeCells(`B${rFunnel}:G${rFunnel + 1}`);
  const guideBox = ws1.getCell(`B${rFunnel}`);
  guideBox.value =
    "💡 HƯỚNG DẪN ĐIỀN BÁO CÁO & CÔNG THỨC EXCEL TỰ ĐỘNG:\n" +
    "• Các dòng nền tảng (Facebook, TikTok, YouTube, Website) có thể tự do chỉnh sửa hoặc gõ tay (VD: Traffic Website từ Google Analytics, chi phí ngoài).\n" +
    "• Toàn bộ dòng Tổng, Chênh lệch, % Biến động và Đơn giá (CPL/CPO) được cài sẵn CÔNG THỨC TỰ ĐỘNG (=SUM, =IF, tỷ lệ chia), bảng sẽ tự động nhảy số khi nhập.";
  guideBox.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF1E3A8A" } };
  guideBox.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
  guideBox.border = thinBorder;
  guideBox.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
  ws1.getRow(rFunnel).height = 24;
  ws1.getRow(rFunnel + 1).height = 24;


  // ============================================================================
  // TAB 2: 🏢🌐 KÊNH & CHI NHÁNH (COMBINED CHANNELS & BRANCHES)
  // ============================================================================
  const ws2 = workbook.addWorksheet("Kênh & Chi nhánh", {
    views: [{ showGridLines: true }],
  });

  ws2.columns = [
    { width: 4 },  // A: Spacer
    { width: 6 },  // B: STT
    { width: 28 }, // C: Tên đơn vị / Kênh
    { width: 16 }, // D: Số bài đăng / Video
    { width: 22 }, // E: Lượt xem / Truy cập web
    { width: 18 }, // F: Lượt tương tác
    { width: 16 }, // G: Khách quan tâm (Leads)
    { width: 16 }, // H: Đã tư vấn
    { width: 16 }, // I: Chuyển đổi
    { width: 16 }, // J: Đơn chốt
    { width: 18 }, // K: Chi phí Ads
    { width: 18 }, // L: CPL (Chi phí/Lead)
  ];

  renderSheetHeader(ws2, `TỔNG HỢP MARKETING THEO CHI NHÁNH & KÊNH NỀN TẢNG – ${periodTitle.toUpperCase()}`, "L");

  // --------------------------------------------------------------------------
  // PHẦN I: HIỆU QUẢ MARKETING THEO CHI NHÁNH (5 CHI NHÁNH HATICO)
  // --------------------------------------------------------------------------
  let r2 = 6;
  ws2.mergeCells(`B${r2}:L${r2}`);
  const secH2a = ws2.getCell(`B${r2}`);
  secH2a.value = "PHẦN I. HIỆU QUẢ MARKETING THEO CHI NHÁNH (5 CHI NHÁNH HATICO)";
  secH2a.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  secH2a.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH2a.alignment = { vertical: "middle", indent: 1 };
  ws2.getRow(r2).height = 24;

  r2++;
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
    const c = ws2.getCell(r2, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws2.getRow(r2).height = 23;

  const branchStartRow = r2 + 1;
  branchResults.forEach((b, idx) => {
    r2++;
    const rowBg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
    const closeRateNum = b.leads > 0 ? b.orders / b.leads : 0;

    const cells = [
      { col: 2, val: idx + 1, align: "center" as const },
      { col: 3, val: b.branchName, align: "left" as const, bold: true },
      { col: 4, val: b.contentCount, align: "right" as const, numFmt: "#,##0" },
      { col: 5, val: b.leads, align: "right" as const, numFmt: "#,##0" },
      { col: 6, val: b.consulted, align: "right" as const, numFmt: "#,##0" },
      { col: 7, val: b.converted, align: "right" as const, numFmt: "#,##0" },
      { col: 8, val: b.orders, align: "right" as const, numFmt: "#,##0" },
      { col: 9, val: b.adSpend, align: "right" as const, numFmt: '#,##0 "đ"' },
      {
        col: 10,
        val: { formula: `IF(E${r2}>0, H${r2}/E${r2}, 0)`, result: closeRateNum },
        align: "center" as const,
        bold: true,
        numFmt: "0.0%",
      },
    ];

    cells.forEach((cell) => {
      const c = ws2.getCell(r2, cell.col);
      c.value = cell.val as any;
      c.font = { name: "Segoe UI", size: 9.5, bold: cell.bold || false, color: { argb: "FF0F172A" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      c.border = thinBorder;
      c.alignment = { horizontal: cell.align, vertical: "middle" };
      if (cell.numFmt) c.numFmt = cell.numFmt;
    });
    ws2.getRow(r2).height = 21;
  });
  const branchEndRow = r2;

  // Dòng TỔNG HỆ THỐNG CHI NHÁNH (Công thức SUM)
  r2++;
  const totCloseRateNum = totalSystemBranch.leads > 0 ? totalSystemBranch.orders / totalSystemBranch.leads : 0;
  const bTotCells = [
    { col: 2, val: "", align: "center" as const },
    { col: 3, val: "TỔNG TOÀN HỆ THỐNG", align: "left" as const, bold: true },
    { col: 4, val: { formula: `SUM(D${branchStartRow}:D${branchEndRow})`, result: totalSystemBranch.contentCount }, align: "right" as const, numFmt: "#,##0" },
    { col: 5, val: { formula: `SUM(E${branchStartRow}:E${branchEndRow})`, result: totalSystemBranch.leads }, align: "right" as const, numFmt: "#,##0" },
    { col: 6, val: { formula: `SUM(F${branchStartRow}:F${branchEndRow})`, result: totalSystemBranch.consulted }, align: "right" as const, numFmt: "#,##0" },
    { col: 7, val: { formula: `SUM(G${branchStartRow}:G${branchEndRow})`, result: totalSystemBranch.converted }, align: "right" as const, numFmt: "#,##0" },
    { col: 8, val: { formula: `SUM(H${branchStartRow}:H${branchEndRow})`, result: totalSystemBranch.orders }, align: "right" as const, numFmt: "#,##0" },
    { col: 9, val: { formula: `SUM(I${branchStartRow}:I${branchEndRow})`, result: totalSystemBranch.adSpend }, align: "right" as const, numFmt: '#,##0 "đ"' },
    { col: 10, val: { formula: `IF(E${r2}>0, H${r2}/E${r2}, 0)`, result: totCloseRateNum }, align: "center" as const, bold: true, numFmt: "0.0%" },
  ];

  bTotCells.forEach((cell) => {
    const c = ws2.getCell(r2, cell.col);
    c.value = cell.val as any;
    c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_ROW_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: cell.align, vertical: "middle" };
    if (cell.numFmt) c.numFmt = cell.numFmt;
  });
  ws2.getRow(r2).height = 23;

  // --------------------------------------------------------------------------
  // PHẦN II: HIỆU QUẢ MARKETING THEO KÊNH TRUYỀN THÔNG & NỀN TẢNG
  // --------------------------------------------------------------------------
  r2 += 3;
  ws2.mergeCells(`B${r2}:L${r2}`);
  const secH2b = ws2.getCell(`B${r2}`);
  secH2b.value = "PHẦN II. HIỆU QUẢ MARKETING THEO KÊNH TRUYỀN THÔNG & NỀN TẢNG";
  secH2b.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  secH2b.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH2b.alignment = { vertical: "middle", indent: 1 };
  ws2.getRow(r2).height = 24;

  r2++;
  const channelCols = [
    "STT",
    "Kênh / Nền tảng",
    "Số bài/video",
    "Lượt xem / Truy cập web",
    "Lượt tương tác",
    "Khách quan tâm",
    "Được tư vấn",
    "Chuyển đổi",
    "Đơn chốt",
    "Chi phí Ads",
    "CPL (Chi phí/Lead)",
  ];

  channelCols.forEach((col, idx) => {
    const c = ws2.getCell(r2, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws2.getRow(r2).height = 23;

  const chStartRow = r2 + 1;
  channelResults.forEach((ch, idx) => {
    r2++;
    const rowBg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
    const chSpend = ch.platform === "facebook" ? (fbAds?.totalCost || 0) : ch.platform === "tiktok" ? (ttAds?.totalCost || 0) : 0;
    const chCpl = ch.leads > 0 && chSpend > 0 ? Math.round(chSpend / ch.leads) : 0;

    const cells = [
      { col: 2, val: idx + 1, align: "center" as const },
      { col: 3, val: ch.platformName, align: "left" as const, bold: true },
      { col: 4, val: ch.contentCount, align: "right" as const, numFmt: "#,##0" },
      { col: 5, val: ch.views, align: "right" as const, numFmt: "#,##0" },
      { col: 6, val: ch.interactions !== null ? ch.interactions : 0, align: "right" as const, numFmt: "#,##0" },
      { col: 7, val: ch.leads, align: "right" as const, numFmt: "#,##0" },
      { col: 8, val: ch.consulted, align: "right" as const, numFmt: "#,##0" },
      { col: 9, val: ch.converted, align: "right" as const, numFmt: "#,##0" },
      { col: 10, val: ch.orders, align: "right" as const, numFmt: "#,##0" },
      { col: 11, val: chSpend, align: "right" as const, numFmt: '#,##0 "đ"' },
      {
        col: 12,
        val: { formula: `IF(G${r2}>0, K${r2}/G${r2}, 0)`, result: chCpl },
        align: "right" as const,
        numFmt: '#,##0 "đ"',
      },
    ];

    cells.forEach((cell) => {
      const c = ws2.getCell(r2, cell.col);
      c.value = cell.val as any;
      c.font = { name: "Segoe UI", size: 9.5, bold: cell.bold || false, color: { argb: "FF0F172A" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      c.border = thinBorder;
      c.alignment = { horizontal: cell.align, vertical: "middle" };
      if (cell.numFmt) c.numFmt = cell.numFmt;
    });
    ws2.getRow(r2).height = 21;
  });
  const chEndRow = r2;

  // Dòng TỔNG KÊNH NỀN TẢNG (Công thức SUM)
  r2++;
  const totalSpend = (fbAds?.totalCost || 0) + (ttAds?.totalCost || 0);
  const totalCpl = channelTotals.leads > 0 && totalSpend > 0 ? Math.round(totalSpend / channelTotals.leads) : 0;
  const totCells = [
    { col: 2, val: "", align: "center" as const },
    { col: 3, val: "TỔNG TOÀN HỆ THỐNG", align: "left" as const, bold: true },
    { col: 4, val: { formula: `SUM(D${chStartRow}:D${chEndRow})`, result: channelTotals.contentCount }, align: "right" as const, numFmt: "#,##0" },
    { col: 5, val: { formula: `SUM(E${chStartRow}:E${chEndRow})`, result: channelTotals.views }, align: "right" as const, numFmt: "#,##0" },
    { col: 6, val: { formula: `SUM(F${chStartRow}:F${chEndRow})`, result: channelTotals.interactions }, align: "right" as const, numFmt: "#,##0" },
    { col: 7, val: { formula: `SUM(G${chStartRow}:G${chEndRow})`, result: channelTotals.leads }, align: "right" as const, numFmt: "#,##0" },
    { col: 8, val: { formula: `SUM(H${chStartRow}:H${chEndRow})`, result: channelTotals.consulted }, align: "right" as const, numFmt: "#,##0" },
    { col: 9, val: { formula: `SUM(I${chStartRow}:I${chEndRow})`, result: channelTotals.converted }, align: "right" as const, numFmt: "#,##0" },
    { col: 10, val: { formula: `SUM(J${chStartRow}:J${chEndRow})`, result: channelTotals.orders }, align: "right" as const, numFmt: "#,##0" },
    { col: 11, val: { formula: `SUM(K${chStartRow}:K${chEndRow})`, result: totalSpend }, align: "right" as const, numFmt: '#,##0 "đ"' },
    { col: 12, val: { formula: `IF(G${r2}>0, K${r2}/G${r2}, 0)`, result: totalCpl }, align: "right" as const, numFmt: '#,##0 "đ"' },
  ];

  totCells.forEach((cell) => {
    const c = ws2.getCell(r2, cell.col);
    c.value = cell.val as any;
    c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_ROW_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: cell.align, vertical: "middle" };
    if (cell.numFmt) c.numFmt = cell.numFmt;
  });
  ws2.getRow(r2).height = 23;


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

  renderSheetHeader(ws3, `DANH SÁCH CHI TIẾT BÀI VIẾT & VIDEO ĐÃ ĐĂNG (${topContents.length} BÀI)`, "L");

  let r3 = 6;
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
    const c = ws3.getCell(r3, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws3.getRow(r3).height = 24;

  const branchGroups: { branchId: string; branchName: string; posts: typeof topContents }[] = HATICO_BRANCHES.map((b) => {
    const posts = topContents.filter((p) => isPostInBranch(p, b.id));
    return {
      branchId: b.id,
      branchName: b.name,
      posts,
    };
  }).filter((g) => g.posts.length > 0);

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
    r3++;
    ws3.mergeCells(`B${r3}:L${r3}`);
    const bHeader = ws3.getCell(`B${r3}`);
    bHeader.value = `CHI NHÁNH: ${group.branchName.toUpperCase()} (${group.posts.length} BÀI VIẾT)`;
    bHeader.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
    bHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    bHeader.border = thinBorder;
    bHeader.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws3.getRow(r3).height = 23;

    const groupStartRow = r3 + 1;
    group.posts.forEach((post, pIdx) => {
      r3++;
      globalPostIndex++;
      const rowBg = pIdx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
      const pic = post.authorName || getBranchPIC(post.branchId || group.branchId);

      const cells = [
        { col: 2, val: globalPostIndex, align: "center" as const },
        { col: 3, val: formatDate(post.publishDate), align: "center" as const },
        { col: 4, val: post.platform, align: "center" as const, bold: true },
        { col: 5, val: post.branchName || group.branchName, align: "left" as const },
        { col: 6, val: post.title, align: "left" as const },
        { col: 7, val: post.views || 0, align: "right" as const, numFmt: "#,##0" },
        { col: 8, val: post.interactions || 0, align: "right" as const, numFmt: "#,##0" },
        { col: 9, val: post.leads || 0, align: "right" as const, numFmt: "#,##0" },
        { col: 10, val: post.orders || 0, align: "right" as const, numFmt: "#,##0" },
        { col: 11, val: pic, align: "left" as const },
        { col: 12, val: post.link || "—", align: "left" as const },
      ];

      cells.forEach((c) => {
        const cell = ws3.getCell(r3, c.col);
        cell.value = c.val as any;
        cell.font = { name: "Segoe UI", size: 9, bold: c.bold || false, color: { argb: "FF0F172A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.border = thinBorder;
        cell.alignment = { horizontal: c.align, vertical: "middle" };
        if (c.numFmt) cell.numFmt = c.numFmt;
      });
      ws3.getRow(r3).height = 20;
    });
    const groupEndRow = r3;

    // Subtotal cho chi nhánh (Dùng công thức SUM)
    r3++;
    ws3.mergeCells(`B${r3}:F${r3}`);
    const subTotTitle = ws3.getCell(`B${r3}`);
    subTotTitle.value = `TỔNG CỘNG ${group.branchName.toUpperCase()}:`;
    subTotTitle.font = { name: "Segoe UI", size: 9, bold: true, italic: true, color: { argb: "FF334155" } };
    subTotTitle.alignment = { horizontal: "right", vertical: "middle" };

    const subCells = [
      { col: 7, val: { formula: `SUM(G${groupStartRow}:G${groupEndRow})`, result: group.posts.reduce((s, p) => s + (p.views || 0), 0) }, numFmt: "#,##0" },
      { col: 8, val: { formula: `SUM(H${groupStartRow}:H${groupEndRow})`, result: group.posts.reduce((s, p) => s + (p.interactions || 0), 0) }, numFmt: "#,##0" },
      { col: 9, val: { formula: `SUM(I${groupStartRow}:I${groupEndRow})`, result: group.posts.reduce((s, p) => s + (p.leads || 0), 0) }, numFmt: "#,##0" },
      { col: 10, val: { formula: `SUM(J${groupStartRow}:J${groupEndRow})`, result: group.posts.reduce((s, p) => s + (p.orders || 0), 0) }, numFmt: "#,##0" },
      { col: 11, val: "—", align: "center" as const },
      { col: 12, val: "—", align: "center" as const },
    ];
    subCells.forEach((c) => {
      const cell = ws3.getCell(r3, c.col);
      cell.value = c.val as any;
      cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: (c.align || "right") as any, vertical: "middle" };
      if (c.numFmt) cell.numFmt = c.numFmt;
    });

    for (let c = 2; c <= 12; c++) {
      const cell = ws3.getCell(r3, c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      cell.border = thinBorder;
    }
    ws3.getRow(r3).height = 21;
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

  renderSheetHeader(ws4, `HIỆU QUẢ QUẢNG CÁO ADS & ĐÁNH GIÁ THỰC HIỆN – ${periodTitle.toUpperCase()}`, "H");

  let r4 = 6;
  ws4.mergeCells(`B${r4}:H${r4}`);
  const secH4a = ws4.getCell(`B${r4}`);
  secH4a.value = "1. CHI TIẾT CHIẾN DỊCH FACEBOOK ADS";
  secH4a.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  secH4a.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH4a.alignment = { vertical: "middle", indent: 1 };
  ws4.getRow(r4).height = 24;

  r4++;
  const adsCols = ["Tên chiến dịch", "Chi nhánh", "Chi phí (VNĐ)", "Khách quan tâm", "Đã tư vấn", "Đơn chốt", "CPL (đ/Lead)"];
  adsCols.forEach((col, idx) => {
    const c = ws4.getCell(r4, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws4.getRow(r4).height = 22;

  const fbCampaigns = fbAds?.campaigns || [];
  if (fbCampaigns.length === 0) {
    r4++;
    ws4.mergeCells(`B${r4}:H${r4}`);
    const emptyC = ws4.getCell(`B${r4}`);
    emptyC.value = "Không có chiến dịch Facebook Ads phát sinh trong kỳ.";
    emptyC.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF64748B" } };
    emptyC.alignment = { horizontal: "center", vertical: "middle" };
    emptyC.border = thinBorder;
    ws4.getRow(r4).height = 22;
  } else {
    fbCampaigns.forEach((camp, idx) => {
      r4++;
      const rowBg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
      const cplVal = camp.leads > 0 ? Math.round(camp.cost / camp.leads) : 0;
      const cells = [
        { col: 2, val: camp.name, align: "left" as const, bold: true },
        { col: 3, val: camp.branchName || "Tổng kho", align: "left" as const },
        { col: 4, val: camp.cost, align: "right" as const, numFmt: '#,##0 "đ"' },
        { col: 5, val: camp.leads, align: "right" as const, numFmt: "#,##0" },
        { col: 6, val: camp.consulted, align: "right" as const, numFmt: "#,##0" },
        { col: 7, val: camp.orders, align: "right" as const, numFmt: "#,##0" },
        { col: 8, val: { formula: `IF(E${r4}>0, D${r4}/E${r4}, 0)`, result: cplVal }, align: "right" as const, numFmt: '#,##0 "đ"' },
      ];
      cells.forEach((cell) => {
        const c = ws4.getCell(r4, cell.col);
        c.value = cell.val as any;
        c.font = { name: "Segoe UI", size: 9.5, bold: cell.bold || false, color: { argb: "FF0F172A" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        c.border = thinBorder;
        c.alignment = { horizontal: cell.align, vertical: "middle" };
        if (cell.numFmt) c.numFmt = cell.numFmt;
      });
      ws4.getRow(r4).height = 21;
    });
  }

  // Section 2: TikTok Ads
  r4 += 2;
  ws4.mergeCells(`B${r4}:H${r4}`);
  const secH4b = ws4.getCell(`B${r4}`);
  secH4b.value = "2. CHI TIẾT CHIẾN DỊCH TIKTOK ADS";
  secH4b.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  secH4b.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH4b.alignment = { vertical: "middle", indent: 1 };
  ws4.getRow(r4).height = 24;

  r4++;
  adsCols.forEach((col, idx) => {
    const c = ws4.getCell(r4, idx + 2);
    c.value = col;
    c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    c.border = thinBorder;
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws4.getRow(r4).height = 22;

  const ttCampaigns = ttAds?.campaigns || [];
  if (ttCampaigns.length === 0) {
    r4++;
    ws4.mergeCells(`B${r4}:H${r4}`);
    const emptyC = ws4.getCell(`B${r4}`);
    emptyC.value = "Không có chiến dịch TikTok Ads phát sinh trong kỳ.";
    emptyC.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF64748B" } };
    emptyC.alignment = { horizontal: "center", vertical: "middle" };
    emptyC.border = thinBorder;
    ws4.getRow(r4).height = 22;
  } else {
    ttCampaigns.forEach((camp, idx) => {
      r4++;
      const rowBg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
      const cplVal = camp.leads > 0 ? Math.round(camp.cost / camp.leads) : 0;
      const cells = [
        { col: 2, val: camp.name, align: "left" as const, bold: true },
        { col: 3, val: camp.branchName || "Tổng kho", align: "left" as const },
        { col: 4, val: camp.cost, align: "right" as const, numFmt: '#,##0 "đ"' },
        { col: 5, val: camp.leads, align: "right" as const, numFmt: "#,##0" },
        { col: 6, val: camp.consulted, align: "right" as const, numFmt: "#,##0" },
        { col: 7, val: camp.orders, align: "right" as const, numFmt: "#,##0" },
        { col: 8, val: { formula: `IF(E${r4}>0, D${r4}/E${r4}, 0)`, result: cplVal }, align: "right" as const, numFmt: '#,##0 "đ"' },
      ];
      cells.forEach((cell) => {
        const c = ws4.getCell(r4, cell.col);
        c.value = cell.val as any;
        c.font = { name: "Segoe UI", size: 9.5, bold: cell.bold || false, color: { argb: "FF0F172A" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        c.border = thinBorder;
        c.alignment = { horizontal: cell.align, vertical: "middle" };
        if (cell.numFmt) c.numFmt = cell.numFmt;
      });
      ws4.getRow(r4).height = 21;
    });
  }

  // Section 3: Đánh giá & Kiến nghị
  r4 += 2;
  ws4.mergeCells(`B${r4}:H${r4}`);
  const secH4c = ws4.getCell(`B${r4}`);
  secH4c.value = "3. NHẬN XÉT, ĐÁNH GIÁ & KIẾN NGHỊ CỦA BỘ PHẬN MARKETING";
  secH4c.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  secH4c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  secH4c.alignment = { vertical: "middle", indent: 1 };
  ws4.getRow(r4).height = 24;

  const evalItems = [
    { title: "A. Kết quả nổi bật / Điểm sáng:", content: evalData?.highlightedResults || "Hoàn thành các chỉ tiêu đăng bài định kỳ." },
    { title: "B. Tồn tại, hạn chế & Khó khăn:", content: evalData?.issuesAndDifficulties || "Cần tăng cường chuyển đổi leads sang cuộc gọi tư vấn sâu." },
    { title: "C. Đề xuất & Kiến nghị hành động:", content: evalData?.proposalsAndRecommendations || "Tập trung sản xuất video giới thiệu sản phẩm chủ lực." },
  ];

  evalItems.forEach((ev) => {
    r4++;
    ws4.mergeCells(`B${r4}:H${r4}`);
    const hCell = ws4.getCell(`B${r4}`);
    hCell.value = ev.title;
    hCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: NAVY } };
    hCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    hCell.border = thinBorder;
    ws4.getRow(r4).height = 22;

    r4++;
    ws4.mergeCells(`B${r4}:H${r4}`);
    const bodyCell = ws4.getCell(`B${r4}`);
    bodyCell.value = ev.content;
    bodyCell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF334155" } };
    bodyCell.alignment = { vertical: "top", wrapText: true };
    bodyCell.border = thinBorder;
    ws4.getRow(r4).height = 36;
  });

  // Section 4: Action plan if available
  if (actionPlan.length > 0) {
    r4 += 2;
    ws4.mergeCells(`B${r4}:H${r4}`);
    const secH4d = ws4.getCell(`B${r4}`);
    secH4d.value = "4. KẾ HOẠCH HÀNH ĐỘNG KỲ TIẾP THEO";
    secH4d.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    secH4d.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    secH4d.alignment = { vertical: "middle", indent: 1 };
    ws4.getRow(r4).height = 24;

    r4++;
    const planCols = ["Nội dung công việc", "Mục tiêu cụ thể", "Người phụ trách", "Thời hạn"];
    ws4.mergeCells(`B${r4}:D${r4}`);
    ws4.getCell(`B${r4}`).value = planCols[0];
    ws4.getCell(`E${r4}`).value = planCols[1];
    ws4.getCell(`F${r4}`).value = planCols[2];
    ws4.mergeCells(`G${r4}:H${r4}`);
    ws4.getCell(`G${r4}`).value = planCols[3];

    for (let c = 2; c <= 8; c++) {
      const cell = ws4.getCell(r4, c);
      cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
      cell.border = thinBorder;
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
    ws4.getRow(r4).height = 22;

    actionPlan.forEach((plan, idx) => {
      r4++;
      const rowBg = idx % 2 === 1 ? ALT_ROW_FILL : "FFFFFFFF";
      ws4.mergeCells(`B${r4}:D${r4}`);
      ws4.getCell(`B${r4}`).value = plan.task;
      ws4.getCell(`E${r4}`).value = plan.target;
      ws4.getCell(`F${r4}`).value = plan.assignee;
      ws4.mergeCells(`G${r4}:H${r4}`);
      ws4.getCell(`G${r4}`).value = plan.deadline;

      for (let c = 2; c <= 8; c++) {
        const cell = ws4.getCell(r4, c);
        cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF0F172A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.border = thinBorder;
        cell.alignment = { horizontal: c === 2 ? "left" : "center", vertical: "middle" };
      }
      ws4.getRow(r4).height = 21;
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

  // Xây dựng tên file báo cáo chuẩn sạch đẹp
  let periodPart = "";
  if (report.periodLabel) {
    periodPart = report.periodLabel.replace(/[\/]/g, "-").replace(/–/g, "-");
  } else if (report.reportType === "weekly") {
    if (report.periodSpan && report.periodSpan > 1) {
      const startW = report.startWeek || report.periodNumber;
      const endW = report.endWeek || (startW + report.periodSpan - 1);
      periodPart = `Tuần ${startW}-${endW} Năm ${report.year}`;
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

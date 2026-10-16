"use client";

import React, { type CSSProperties } from "react";
import { MarketingPeriodicReport } from "@/lib/periodic-marketing-types";
import { getBranchPIC } from "@/lib/marketing-types";

interface PeriodicMarketingPrintDocumentProps {
  report: MarketingPeriodicReport;
}

const cellStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  padding: "5px 7px",
  verticalAlign: "middle",
  fontSize: "8pt",
  lineHeight: 1.35,
  color: "#0f172a",
};

const thStyle: CSSProperties = {
  ...cellStyle,
  backgroundColor: "#f1f5f9",
  fontWeight: 700,
  color: "#0f172a",
  textAlign: "center",
  textTransform: "uppercase",
  fontSize: "7.5pt",
  letterSpacing: "0.03em",
};

const numCellStyle: CSSProperties = {
  ...cellStyle,
  textAlign: "right",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontVariantNumeric: "tabular-nums",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  border: "1px solid #94a3b8",
  marginTop: "4px",
  marginBottom: "10px",
  pageBreakInside: "avoid",
};

function formatShortDate(dateStr?: string) {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function formatVnd(val?: number) {
  if (val === undefined || val === null) return "0 đ";
  return new Intl.NumberFormat("vi-VN").format(val) + " đ";
}

function formatNum(val?: number | null) {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("vi-VN").format(val);
}

export function PeriodicMarketingPrintDocument({ report }: PeriodicMarketingPrintDocumentProps) {
  const d = report.data;
  const kpis = d?.kpis;

  const isWeekly = report.reportType === "weekly";
  const titleText = report.periodLabel
    ? `BÁO CÁO MARKETING ${report.periodLabel.toUpperCase()}`
    : isWeekly
      ? `BÁO CÁO MARKETING TUẦN ${report.periodNumber} / ${report.year}`
      : `BÁO CÁO MARKETING THÁNG ${report.periodNumber} / ${report.year}`;

  const allContents = d?.topContents || [];

  return (
    <div className="periodic-print-root" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#0f172a", lineHeight: 1.3 }}>
      {/* 1. HEADER WITH LOGO */}
      <div className="print-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "2px solid #0f172a", paddingBottom: "8px", marginBottom: "10px" }}>
        <div style={{ flex: 1, paddingRight: "16px" }}>
          <p style={{ margin: "0 0 2px 0", fontSize: "8pt", fontWeight: 700, textTransform: "uppercase", color: "#334155", letterSpacing: "0.06em" }}>
            CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU QUỐC TẾ HATICO
          </p>
          <p style={{ margin: "0 0 4px 0", fontSize: "7.5pt", color: "#64748b", fontWeight: 600 }}>
            PHÒNG MARKETING & TRUYỀN THÔNG TOÀN QUỐC
          </p>
          <h1 style={{ margin: "4px 0 6px 0", fontSize: "13pt", fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.02em" }}>
            {titleText}
          </h1>
          <p style={{ margin: 0, fontSize: "8pt", color: "#334155", lineHeight: 1.4 }}>
            <span><strong>Kỳ báo cáo:</strong> {formatShortDate(report.startDate)} — {formatShortDate(report.endDate)}</span>
            <span style={{ margin: "0 6px", color: "#94a3b8" }}>·</span>
            <span><strong>Phạm vi:</strong> {report.branchName}</span>
            <span style={{ margin: "0 6px", color: "#94a3b8" }}>·</span>
            <span><strong>Người lập:</strong> {report.creatorName}</span>
            <span style={{ margin: "0 6px", color: "#94a3b8" }}>·</span>
            <span style={{ fontWeight: 700, color: "#0f172a" }}>
              {report.status === "closed" ? "ĐÃ CHỐT CHÍNH THỨC" : "BẢN NHÁP"}
            </span>
            {report.closedBy && (
              <span style={{ marginLeft: "4px", fontSize: "7.5pt", color: "#475569" }}>
                (Duyệt bởi: {report.closedBy})
              </span>
            )}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo/hatico_logo.png"
          alt="Hatico Logo"
          width={80}
          height={80}
          style={{ width: "80px", height: "80px", objectFit: "contain", flexShrink: 0 }}
        />
      </div>

      {/* 2. BẢNG 8 CHỈ SỐ KPI TỔNG HỢP CỐT LÕI */}
      <section style={{ marginBottom: "10px", pageBreakInside: "avoid" }}>
        <h2 style={{ fontSize: "8.5pt", fontWeight: 800, color: "#0f172a", margin: "0 0 3px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          I. CHỈ SỐ KPI MARKETING CỐT LÕI
        </h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Tổng bài/video</th>
              <th style={thStyle}>Lượt xem</th>
              <th style={thStyle}>Lượt tương tác</th>
              <th style={thStyle}>Khách quan tâm</th>
              <th style={thStyle}>Đã tư vấn</th>
              <th style={thStyle}>Chuyển đổi</th>
              <th style={thStyle}>Đơn hàng chốt</th>
              <th style={thStyle}>Tổng chi phí Ads</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...numCellStyle, fontWeight: 700, textAlign: "center" }}>
                {formatNum(kpis?.totalContents ?? 0)}
              </td>
              <td style={{ ...numCellStyle, fontWeight: 700, textAlign: "center" }}>
                {formatNum(kpis?.totalViews ?? 0)}
              </td>
              <td style={{ ...numCellStyle, fontWeight: 700, textAlign: "center" }}>
                {formatNum(kpis?.totalInteractions ?? 0)}
              </td>
              <td style={{ ...numCellStyle, fontWeight: 700, textAlign: "center" }}>
                {formatNum(kpis?.totalLeads ?? 0)}
              </td>
              <td style={{ ...numCellStyle, fontWeight: 700, textAlign: "center" }}>
                {formatNum(kpis?.totalConsulted ?? 0)}
              </td>
              <td style={{ ...numCellStyle, fontWeight: 700, textAlign: "center" }}>
                {formatNum(kpis?.totalConverted ?? 0)}
              </td>
              <td style={{ ...numCellStyle, fontWeight: 800, textAlign: "center" }}>
                {formatNum(kpis?.totalOrders ?? 0)}
              </td>
              <td style={{ ...numCellStyle, fontWeight: 800, textAlign: "center" }}>
                {formatVnd(kpis?.totalAdSpend ?? 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 3. BẢNG KẾT QUẢ THEO KÊNH TRUYỀN THÔNG */}
      <section style={{ marginBottom: "10px", pageBreakInside: "avoid" }}>
        <h2 style={{ fontSize: "8.5pt", fontWeight: 800, color: "#0f172a", margin: "0 0 3px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          II. HIỆU QUẢ CÁC KÊNH TRUYỀN THÔNG (MẠNG XÃ HỘI & WEBSITE)
        </h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Kênh phát triển</th>
              <th style={thStyle}>Số bài/video</th>
              <th style={thStyle}>Lượt xem</th>
              <th style={thStyle}>Tương tác</th>
              <th style={thStyle}>Khách quan tâm</th>
              <th style={thStyle}>Đã tư vấn</th>
              <th style={thStyle}>Chuyển đổi</th>
              <th style={thStyle}>Đơn chốt</th>
            </tr>
          </thead>
          <tbody>
            {(d?.channelResults || []).map((ch) => (
              <tr key={ch.platform}>
                <td style={{ ...cellStyle, fontWeight: 600 }}>{ch.platformName}</td>
                <td style={numCellStyle}>{formatNum(ch.contentCount)}</td>
                <td style={numCellStyle}>{formatNum(ch.views)}</td>
                <td style={numCellStyle}>{ch.interactions !== null ? formatNum(ch.interactions) : "—"}</td>
                <td style={numCellStyle}>{formatNum(ch.leads)}</td>
                <td style={numCellStyle}>{formatNum(ch.consulted)}</td>
                <td style={numCellStyle}>{formatNum(ch.converted)}</td>
                <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(ch.orders)}</td>
              </tr>
            ))}
            {d?.channelTotals && (
              <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
                <td style={{ ...cellStyle, fontWeight: 800 }}>TỔNG CỘNG TOÀN KÊNH</td>
                <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d.channelTotals.contentCount)}</td>
                <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d.channelTotals.views)}</td>
                <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d.channelTotals.interactions)}</td>
                <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d.channelTotals.leads)}</td>
                <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d.channelTotals.consulted)}</td>
                <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d.channelTotals.converted)}</td>
                <td style={{ ...numCellStyle, fontWeight: 800 }}>{formatNum(d.channelTotals.orders)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* 4. BẢNG CHIẾN DỊCH QUẢNG CÁO ADS */}
      <section style={{ marginBottom: "10px", pageBreakInside: "avoid" }}>
        <h2 style={{ fontSize: "8.5pt", fontWeight: 800, color: "#0f172a", margin: "0 0 3px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          III. BÁO CÁO CHIẾN DỊCH QUẢNG CÁO (ADS)
        </h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Nền tảng Ads</th>
              <th style={thStyle}>Chi phí trong kỳ</th>
              <th style={thStyle}>Khách quan tâm</th>
              <th style={thStyle}>Giá / Khách (CPL)</th>
              <th style={thStyle}>Đã tư vấn</th>
              <th style={thStyle}>Chuyển đổi</th>
              <th style={thStyle}>Đơn chốt</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...cellStyle, fontWeight: 600 }}>Facebook Ads</td>
              <td style={{ ...numCellStyle, fontWeight: 600 }}>
                {formatVnd(d?.adComparison?.facebook?.cost ?? 0)}
              </td>
              <td style={numCellStyle}>{formatNum(d?.adComparison?.facebook?.leads ?? 0)}</td>
              <td style={numCellStyle}>
                {d?.adComparison?.facebook?.cpl ? formatVnd(d.adComparison.facebook.cpl) : "—"}
              </td>
              <td style={numCellStyle}>{formatNum(d?.adComparison?.facebook?.consulted ?? 0)}</td>
              <td style={numCellStyle}>{formatNum(d?.adComparison?.facebook?.converted ?? 0)}</td>
              <td style={{ ...numCellStyle, fontWeight: 700 }}>
                {formatNum(d?.adComparison?.facebook?.orders ?? 0)}
              </td>
            </tr>
            <tr>
              <td style={{ ...cellStyle, fontWeight: 600 }}>TikTok Ads</td>
              <td style={{ ...numCellStyle, fontWeight: 600 }}>
                {formatVnd(d?.adComparison?.tiktok?.cost ?? 0)}
              </td>
              <td style={numCellStyle}>{formatNum(d?.adComparison?.tiktok?.leads ?? 0)}</td>
              <td style={numCellStyle}>
                {d?.adComparison?.tiktok?.cpl ? formatVnd(d.adComparison.tiktok.cpl) : "—"}
              </td>
              <td style={numCellStyle}>{formatNum(d?.adComparison?.tiktok?.consulted ?? 0)}</td>
              <td style={numCellStyle}>{formatNum(d?.adComparison?.tiktok?.converted ?? 0)}</td>
              <td style={{ ...numCellStyle, fontWeight: 700 }}>
                {formatNum(d?.adComparison?.tiktok?.orders ?? 0)}
              </td>
            </tr>
            <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
              <td style={{ ...cellStyle, fontWeight: 800 }}>TỔNG CHIẾN DỊCH ADS</td>
              <td style={{ ...numCellStyle, fontWeight: 800 }}>
                {formatVnd(d?.adComparison?.total?.cost ?? 0)}
              </td>
              <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d?.adComparison?.total?.leads ?? 0)}</td>
              <td style={{ ...numCellStyle, fontWeight: 700 }}>
                {d?.adComparison?.total?.cpl ? formatVnd(d.adComparison.total.cpl) : "—"}
              </td>
              <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d?.adComparison?.total?.consulted ?? 0)}</td>
              <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d?.adComparison?.total?.converted ?? 0)}</td>
              <td style={{ ...numCellStyle, fontWeight: 800 }}>
                {formatNum(d?.adComparison?.total?.orders ?? 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 5. BẢNG HIỆU QUẢ THEO CHI NHÁNH */}
      <section style={{ marginBottom: "10px", pageBreakInside: "avoid" }}>
        <h2 style={{ fontSize: "8.5pt", fontWeight: 800, color: "#0f172a", margin: "0 0 3px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          IV. KẾT QUẢ MARKETING THEO CHI NHÁNH
        </h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Chi nhánh</th>
              <th style={thStyle}>Số bài đăng</th>
              <th style={thStyle}>Khách quan tâm</th>
              <th style={thStyle}>Đã tư vấn</th>
              <th style={thStyle}>Chuyển đổi</th>
              <th style={thStyle}>Đơn chốt</th>
              <th style={thStyle}>Chi phí Ads</th>
            </tr>
          </thead>
          <tbody>
            {(d?.branchResults || []).map((br) => (
              <tr key={br.branchId}>
                <td style={{ ...cellStyle, fontWeight: 600 }}>{br.branchName}</td>
                <td style={numCellStyle}>{formatNum(br.contentCount)}</td>
                <td style={numCellStyle}>{formatNum(br.leads)}</td>
                <td style={numCellStyle}>{formatNum(br.consulted)}</td>
                <td style={numCellStyle}>{formatNum(br.converted)}</td>
                <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(br.orders)}</td>
                <td style={numCellStyle}>{formatVnd(br.adSpend)}</td>
              </tr>
            ))}
            {d?.totalSystemBranch && (
              <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
                <td style={{ ...cellStyle, fontWeight: 800 }}>TỔNG TOÀN HỆ THỐNG</td>
                <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d.totalSystemBranch.contentCount)}</td>
                <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d.totalSystemBranch.leads)}</td>
                <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d.totalSystemBranch.consulted)}</td>
                <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(d.totalSystemBranch.converted)}</td>
                <td style={{ ...numCellStyle, fontWeight: 800 }}>{formatNum(d.totalSystemBranch.orders)}</td>
                <td style={{ ...numCellStyle, fontWeight: 800 }}>
                  {formatVnd(d.totalSystemBranch.adSpend)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* 6. DANH SÁCH CHI TIẾT TẤT CẢ BÀI VIẾT / VIDEO ĐÃ ĐĂNG TRONG KỲ */}
      {allContents.length > 0 && (
        <section style={{ marginBottom: "10px" }}>
          <h2 style={{ fontSize: "8.5pt", fontWeight: 800, color: "#0f172a", margin: "0 0 3px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            V. DANH SÁCH CHI TIẾT BÀI VIẾT & VIDEO ĐÃ ĐĂNG TRONG KỲ ({allContents.length} BÀI)
          </h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: "28px" }}>STT</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Tên bài viết / video</th>
                <th style={{ ...thStyle, width: "65px" }}>Kênh</th>
                <th style={{ ...thStyle, width: "70px" }}>Định dạng</th>
                <th style={{ ...thStyle, width: "70px" }}>Ngày đăng</th>
                <th style={{ ...thStyle, width: "65px" }}>Lượt xem</th>
                <th style={{ ...thStyle, width: "60px" }}>Tương tác</th>
                <th style={{ ...thStyle, width: "55px" }}>Khách QT</th>
              </tr>
            </thead>
            <tbody>
              {allContents.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={{ ...cellStyle, textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                  <td style={{ ...cellStyle, fontWeight: 600 }}>
                    <div>{item.title}</div>
                    {(item.authorName || item.branchName) && (
                      <div style={{ fontSize: "7pt", color: "#64748b", fontWeight: 400, marginTop: "1px" }}>
                        {item.branchName ? `${item.branchName} ` : ""}
                        · Phụ trách: {getBranchPIC(item.branchId, item.branchName)}
                      </div>
                    )}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center", textTransform: "uppercase", fontSize: "7.5pt", fontWeight: 600 }}>
                    {item.platform}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center", fontSize: "7.5pt", color: "#475569" }}>
                    {item.contentType || "—"}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                    {formatShortDate(item.publishDate)}
                  </td>
                  <td style={{ ...numCellStyle, fontWeight: 700 }}>{formatNum(item.views)}</td>
                  <td style={numCellStyle}>{formatNum(item.interactions)}</td>
                  <td style={{ ...numCellStyle, fontWeight: 600 }}>
                    {item.leads !== undefined && item.leads > 0 ? formatNum(item.leads) : "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 7. ĐÁNH GIÁ & NHẬN XÉT HOẠT ĐỘNG */}
      <section style={{ marginBottom: "10px", pageBreakInside: "avoid" }}>
        <h2 style={{ fontSize: "8.5pt", fontWeight: 800, color: "#0f172a", margin: "0 0 3px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          VI. ĐÁNH GIÁ VÀ NHẬN XÉT HOẠT ĐỘNG
        </h2>
        <div style={{ border: "1px solid #cbd5e1", padding: "7px 9px", fontSize: "8pt", lineHeight: 1.45, backgroundColor: "#ffffff" }}>
          <div style={{ marginBottom: "5px" }}>
            <strong style={{ color: "#0f172a", fontSize: "8pt", textTransform: "uppercase" }}>01. Kết quả nổi bật:</strong>
            <p style={{ margin: "2px 0 5px 0", whiteSpace: "pre-wrap", color: "#334155" }}>
              {report.evaluation?.highlightedResults || "Chưa có ghi nhận."}
            </p>
          </div>
          <div style={{ marginBottom: "5px" }}>
            <strong style={{ color: "#0f172a", fontSize: "8pt", textTransform: "uppercase" }}>02. Tồn tại và khó khăn:</strong>
            <p style={{ margin: "2px 0 5px 0", whiteSpace: "pre-wrap", color: "#334155" }}>
              {report.evaluation?.issuesAndDifficulties || "Chưa có ghi nhận."}
            </p>
          </div>
          <div>
            <strong style={{ color: "#0f172a", fontSize: "8pt", textTransform: "uppercase" }}>03. Đề xuất và kiến nghị:</strong>
            <p style={{ margin: "2px 0 0 0", whiteSpace: "pre-wrap", color: "#334155" }}>
              {report.evaluation?.proposalsAndRecommendations || "Chưa có ghi nhận."}
            </p>
          </div>
        </div>
      </section>

      {/* 8. KẾ HOẠCH HÀNH ĐỘNG KỲ TIẾP THEO */}
      <section style={{ marginBottom: "14px", pageBreakInside: "avoid" }}>
        <h2 style={{ fontSize: "8.5pt", fontWeight: 800, color: "#0f172a", margin: "0 0 3px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          VII. KẾ HOẠCH HÀNH ĐỘNG KỲ TIẾP THEO
        </h2>
        {report.actionPlan && report.actionPlan.length > 0 ? (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: "28px" }}>STT</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Nhiệm vụ / Công việc</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Mục tiêu cụ thể</th>
                <th style={thStyle}>Người phụ trách</th>
                <th style={thStyle}>Thời hạn</th>
              </tr>
            </thead>
            <tbody>
              {report.actionPlan.map((plan, idx) => (
                <tr key={plan.id}>
                  <td style={{ ...cellStyle, textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                  <td style={{ ...cellStyle, fontWeight: 600 }}>{plan.task}</td>
                  <td style={cellStyle}>{plan.target}</td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>{plan.assignee}</td>
                  <td style={{ ...cellStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                    {formatShortDate(plan.deadline)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontSize: "8pt", color: "#64748b" }}>
            Chưa thiết lập kế hoạch hành động.
          </div>
        )}
      </section>

      {/* 9. SIGNATURES FOOTER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "18px", paddingTop: "6px", pageBreakInside: "avoid", textAlign: "center" }}>
        <div style={{ width: "30%" }}>
          <p style={{ margin: "0 0 38px 0", fontSize: "8pt", fontWeight: 700, textTransform: "uppercase" }}>
            NGƯỜI LẬP BÁO CÁO
          </p>
          <p style={{ margin: 0, fontSize: "8pt", fontWeight: 600 }}>{report.creatorName}</p>
        </div>
        <div style={{ width: "30%" }}>
          <p style={{ margin: "0 0 38px 0", fontSize: "8pt", fontWeight: 700, textTransform: "uppercase" }}>
            TRƯỞNG PHÒNG MARKETING
          </p>
          <p style={{ margin: 0, fontSize: "8pt", color: "#64748b" }}>(Ký và ghi rõ họ tên)</p>
        </div>
        <div style={{ width: "30%" }}>
          <p style={{ margin: "0 0 38px 0", fontSize: "8pt", fontWeight: 700, textTransform: "uppercase" }}>
            BAN GIÁM ĐỐC DUYỆT
          </p>
          <p style={{ margin: 0, fontSize: "8pt", color: "#64748b" }}>(Ký và đóng dấu)</p>
        </div>
      </div>
    </div>
  );
}

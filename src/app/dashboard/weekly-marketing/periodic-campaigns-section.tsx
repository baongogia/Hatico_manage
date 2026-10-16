import React from "react";
import {
  AdPlatformReport,
  AdComparisonSummary,
} from "@/lib/periodic-marketing-types";

interface PeriodicCampaignsSectionProps {
  facebookAds: AdPlatformReport;
  tiktokAds: AdPlatformReport;
  adComparison: AdComparisonSummary;
  isEditing?: boolean;
  onUpdateAdMetric?: (
    platform: "facebook" | "tiktok",
    field: "cost" | "leads" | "consulted" | "converted" | "orders",
    value: number
  ) => void;
}

export function PeriodicCampaignsSection({
  facebookAds,
  tiktokAds,
  adComparison,
  isEditing = false,
  onUpdateAdMetric,
}: PeriodicCampaignsSectionProps) {
  const formatCost = (val: number) => `${val.toLocaleString("vi-VN")} ₫`;
  const formatCpl = (val: number | null) => (val !== null ? `${val.toLocaleString("vi-VN")} ₫` : "—");
  const formatNum = (val: number) => val.toLocaleString("vi-VN");

  const renderPlatformSection = (ad: AdPlatformReport, isFb: boolean) => (
    <div className="border border-slate-200/90 rounded-[4px] bg-white p-3.5 space-y-3 shadow-2xs print:border-slate-300 print:shadow-none">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-900" />
          <span className="uppercase tracking-wider">{ad.platformName} ({ad.activeCampaignsCount} chiến dịch)</span>
        </h4>
        <div className="text-xs font-bold font-mono text-slate-900">
          Chi phí: {formatCost(ad.totalCost)}
        </div>
      </div>

      {/* Mini KPI row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
        <div className="bg-slate-50 p-2 rounded-[4px] border border-slate-200/70">
          <span className="block text-[10px] text-slate-500 font-medium">Khách quan tâm</span>
          <span className="text-sm font-bold font-mono text-slate-900">{formatNum(ad.leads)}</span>
        </div>
        <div className="bg-slate-50 p-2 rounded-[4px] border border-slate-200/70">
          <span className="block text-[10px] text-slate-500 font-medium">Đã tư vấn</span>
          <span className="text-sm font-bold font-mono text-slate-900">{formatNum(ad.consulted)}</span>
        </div>
        <div className="bg-slate-50 p-2 rounded-[4px] border border-slate-200/70">
          <span className="block text-[10px] text-slate-500 font-medium">Chuyển đổi</span>
          <span className="text-sm font-bold font-mono text-slate-900">{formatNum(ad.converted)}</span>
        </div>
        <div className="bg-slate-50 p-2 rounded-[4px] border border-slate-200/70">
          <span className="block text-[10px] text-slate-500 font-medium">Đơn chốt</span>
          <span className="text-sm font-bold font-mono text-slate-900">{formatNum(ad.orders)}</span>
        </div>
        <div className="bg-slate-50 p-2 rounded-[4px] border border-slate-200/70 col-span-2">
          <span className="block text-[10px] text-slate-500 font-medium">CPL (Chi phí / Khách)</span>
          <span className="text-sm font-extrabold font-mono text-slate-900">{formatCpl(ad.cpl)}</span>
        </div>
      </div>

      {/* Detail Table */}
      {ad.campaigns.length === 0 ? (
        <div className="p-3 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-[4px]">
          Chưa có chiến dịch {ad.platformName} nào trong kỳ.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-2 px-2.5">Tên chiến dịch</th>
                <th className="py-2 px-2.5">Chi nhánh</th>
                <th className="py-2 px-2.5 text-right">Chi phí thực tế</th>
                <th className="py-2 px-2.5 text-right">Khách QT</th>
                <th className="py-2 px-2.5 text-right">Đã tư vấn</th>
                <th className="py-2 px-2.5 text-right">Đơn chốt</th>
                <th className="py-2 px-2.5 text-right">CPL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {ad.campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-2.5 font-sans font-medium text-slate-900 max-w-xs truncate" title={c.name}>
                    {c.name}
                  </td>
                  <td className="py-2 px-2.5 font-sans text-slate-600 whitespace-nowrap">
                    {c.branchName}
                  </td>
                  <td className="py-2 px-2.5 text-right font-medium text-slate-900">
                    {formatCost(c.cost)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-medium text-slate-900">
                    {formatNum(c.leads)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-slate-700">
                    {formatNum(c.consulted)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                    {formatNum(c.orders)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                    {formatCpl(c.cpl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* A. Facebook Ads */}
      {renderPlatformSection(facebookAds, true)}

      {/* B. TikTok Ads */}
      {renderPlatformSection(tiktokAds, false)}

      {/* C. Bảng tổng hợp so sánh hiệu quả quảng cáo */}
      <div className="border border-slate-200/90 rounded-[4px] bg-white p-3.5 shadow-2xs print:border-slate-300 print:shadow-none space-y-2">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Bảng tổng hợp & so sánh hiệu quả các kênh Ads
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-800 font-bold">
                <th className="py-2.5 px-3 w-1/3">Chỉ số</th>
                <th className="py-2.5 px-3 text-right">Facebook Ads</th>
                <th className="py-2.5 px-3 text-right">TikTok Ads</th>
                <th className="py-2.5 px-3 text-right bg-slate-200/70 font-extrabold text-slate-900">
                  Tổng Ads
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              <tr className="hover:bg-slate-50/50">
                <td className="py-2 px-3 font-sans font-medium text-slate-900">Chi phí quảng cáo (₫)</td>
                <td className="py-2 px-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={adComparison.facebook.cost}
                      onChange={(e) =>
                        onUpdateAdMetric?.("facebook", "cost", Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-28 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  ) : (
                    <span className="font-semibold text-slate-900">{formatCost(adComparison.facebook.cost)}</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={adComparison.tiktok.cost}
                      onChange={(e) =>
                        onUpdateAdMetric?.("tiktok", "cost", Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-28 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  ) : (
                    <span className="font-semibold text-slate-900">{formatCost(adComparison.tiktok.cost)}</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right font-extrabold bg-slate-50 text-slate-900">
                  {formatCost(adComparison.total.cost)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50">
                <td className="py-2 px-3 font-sans font-medium text-slate-900">Khách quan tâm</td>
                <td className="py-2 px-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={adComparison.facebook.leads}
                      onChange={(e) =>
                        onUpdateAdMetric?.("facebook", "leads", Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-20 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  ) : (
                    <span className="font-semibold text-slate-900">{formatNum(adComparison.facebook.leads)}</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={adComparison.tiktok.leads}
                      onChange={(e) =>
                        onUpdateAdMetric?.("tiktok", "leads", Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-20 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  ) : (
                    <span className="font-semibold text-slate-900">{formatNum(adComparison.tiktok.leads)}</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right font-bold bg-slate-50 text-slate-900">
                  {formatNum(adComparison.total.leads)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50">
                <td className="py-2 px-3 font-sans font-medium text-slate-900">Khách đã tư vấn</td>
                <td className="py-2 px-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={adComparison.facebook.consulted}
                      onChange={(e) =>
                        onUpdateAdMetric?.("facebook", "consulted", Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-20 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  ) : (
                    formatNum(adComparison.facebook.consulted)
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={adComparison.tiktok.consulted}
                      onChange={(e) =>
                        onUpdateAdMetric?.("tiktok", "consulted", Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-20 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  ) : (
                    formatNum(adComparison.tiktok.consulted)
                  )}
                </td>
                <td className="py-2 px-3 text-right font-bold bg-slate-50 text-slate-900">
                  {formatNum(adComparison.total.consulted)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50">
                <td className="py-2 px-3 font-sans font-medium text-slate-900">Khách chuyển đổi</td>
                <td className="py-2 px-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={adComparison.facebook.converted}
                      onChange={(e) =>
                        onUpdateAdMetric?.("facebook", "converted", Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-20 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  ) : (
                    formatNum(adComparison.facebook.converted)
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={adComparison.tiktok.converted}
                      onChange={(e) =>
                        onUpdateAdMetric?.("tiktok", "converted", Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-20 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  ) : (
                    formatNum(adComparison.tiktok.converted)
                  )}
                </td>
                <td className="py-2 px-3 text-right font-bold bg-slate-50 text-slate-900">
                  {formatNum(adComparison.total.converted)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50">
                <td className="py-2 px-3 font-sans font-medium text-slate-900">Đơn chốt</td>
                <td className="py-2 px-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={adComparison.facebook.orders}
                      onChange={(e) =>
                        onUpdateAdMetric?.("facebook", "orders", Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-20 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{formatNum(adComparison.facebook.orders)}</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={adComparison.tiktok.orders}
                      onChange={(e) =>
                        onUpdateAdMetric?.("tiktok", "orders", Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-20 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{formatNum(adComparison.tiktok.orders)}</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right font-extrabold bg-slate-50 text-slate-900">
                  {formatNum(adComparison.total.orders)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50 bg-slate-50/30">
                <td className="py-2.5 px-3 font-sans font-bold text-slate-900">CPL (Chi phí / Khách)</td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                  {formatCpl(adComparison.facebook.cpl)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                  {formatCpl(adComparison.tiktok.cpl)}
                </td>
                <td className="py-2.5 px-3 text-right font-black bg-slate-100 text-slate-900">
                  {formatCpl(adComparison.total.cpl)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

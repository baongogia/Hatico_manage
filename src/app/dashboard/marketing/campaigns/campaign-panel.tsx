"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  AdPlatform,
  MarketingCampaignItem,
  MarketingLeadItem,
  CampaignStatus,
  CAMPAIGN_STATUS_LABELS,
  HATICO_BRANCHES,
  HATICO_FANPAGES,
} from "@/lib/marketing-types";
import {
  getMarketingCampaignsAction,
  saveMarketingCampaignAction,
  deleteMarketingCampaignAction,
  getMarketingLeadsAction,
} from "@/app/actions-marketing";
import { CustomSelect } from "@/components/custom-select";

interface CampaignPanelProps {
  platform: AdPlatform;
  title: string;
}

type PresetRange = "this_month" | "last_month" | "7days" | "all" | "custom";

const getMonthRange = (offsetMonths = 0) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(yyyy, d.getMonth() + 1, 0).getDate();
  const dd = String(lastDay).padStart(2, "0");
  return { start: `${yyyy}-${mm}-01`, end: `${yyyy}-${mm}-${dd}` };
};

export function CampaignPanel({ platform, title }: CampaignPanelProps) {
  const [campaigns, setCampaigns] = useState<MarketingCampaignItem[]>([]);
  const [leads, setLeads] = useState<MarketingLeadItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [presetRange, setPresetRange] = useState<PresetRange>("this_month");
  const [startDate, setStartDate] = useState<string>(() => getMonthRange(0).start);
  const [endDate, setEndDate] = useState<string>(() => getMonthRange(0).end);

  const handlePresetChange = (preset: PresetRange) => {
    setPresetRange(preset);
    const now = new Date();
    if (preset === "this_month") {
      const r = getMonthRange(0);
      setStartDate(r.start);
      setEndDate(r.end);
    } else if (preset === "last_month") {
      const r = getMonthRange(-1);
      setStartDate(r.start);
      setEndDate(r.end);
    } else if (preset === "7days") {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const nowY = now.getFullYear();
      const nowM = String(now.getMonth() + 1).padStart(2, "0");
      const nowD = String(now.getDate()).padStart(2, "0");
      setStartDate(`${yyyy}-${mm}-${dd}`);
      setEndDate(`${nowY}-${nowM}-${nowD}`);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const [isPending, startTransition] = useTransition();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MarketingCampaignItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formBranchId, setFormBranchId] = useState("");
  const [formFanpage, setFormFanpage] = useState("");
  const [formTargetObjective, setFormTargetObjective] = useState("");
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [formEndDate, setFormEndDate] = useState("");
  const [formBudget, setFormBudget] = useState<number | string>(0);
  const [formActualCost, setFormActualCost] = useState<number | string>(0);
  const [formReachOrViews, setFormReachOrViews] = useState<number | string>(0);
  const [formInteractions, setFormInteractions] = useState<number | string>(0);
  const [formStatus, setFormStatus] = useState<CampaignStatus>("running");
  const [formNotes, setFormNotes] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadCampaigns = () => {
    startTransition(async () => {
      const [campRes, leadsRes] = await Promise.all([
        getMarketingCampaignsAction(
          platform,
          selectedBranch === "all" ? undefined : selectedBranch,
          startDate || undefined,
          endDate || undefined
        ),
        getMarketingLeadsAction(
          undefined,
          selectedBranch === "all" ? undefined : selectedBranch,
          startDate || undefined,
          endDate || undefined
        ),
      ]);
      if (campRes.data) {
        setCampaigns(campRes.data);
      }
      if (leadsRes.data) {
        setLeads(leadsRes.data);
      }
    });
  };

  useEffect(() => {
    loadCampaigns();
  }, [platform, selectedBranch, startDate, endDate]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName("");
    setFormBranchId(HATICO_BRANCHES[0].id);
    setFormFanpage(HATICO_FANPAGES[0]);
    setFormTargetObjective("Tìm kiếm khách hàng tiềm năng");
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setFormEndDate("");
    setFormBudget(0);
    setFormActualCost(0);
    setFormReachOrViews(0);
    setFormInteractions(0);
    setFormStatus("running");
    setFormNotes("");
    setShowModal(true);
  };

  const handleOpenEdit = (c: MarketingCampaignItem) => {
    setEditingItem(c);
    setFormName(c.name);
    setFormBranchId(c.branch_id || HATICO_BRANCHES[0].id);
    setFormFanpage(c.fanpage_name || HATICO_FANPAGES[0]);
    setFormTargetObjective(c.target_objective || "");
    setFormStartDate(c.start_date);
    setFormEndDate(c.end_date || "");
    setFormBudget(c.budget);
    setFormActualCost(c.actual_cost);
    setFormReachOrViews(platform === "facebook_ads" ? c.reach : c.views);
    setFormInteractions(c.interactions);
    setFormStatus(c.status);
    setFormNotes(c.notes || "");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Vui lòng nhập tên chiến dịch!");
      return;
    }

    const payload: MarketingCampaignItem = {
      id: editingItem ? editingItem.id : "",
      platform,
      name: formName.trim(),
      branch_id: formBranchId || undefined,
      fanpage_name: formFanpage || undefined,
      target_objective: formTargetObjective.trim() || undefined,
      start_date: formStartDate,
      end_date: formEndDate || undefined,
      budget: Number(formBudget) || 0,
      actual_cost: Number(formActualCost) || 0,
      reach: platform === "facebook_ads" ? Number(formReachOrViews) || 0 : 0,
      views: platform === "tiktok_ads" ? Number(formReachOrViews) || 0 : 0,
      interactions: Number(formInteractions) || 0,
      leads_count: 0,
      consulted_count: 0,
      converted_count: 0,
      orders_count: 0,
      status: formStatus,
      notes: formNotes.trim() || undefined,
    };

    const res = await saveMarketingCampaignAction(payload);
    if (res.error) {
      alert(res.error);
    } else {
      setShowModal(false);
      showToast(editingItem ? "Đã cập nhật chiến dịch!" : "Đã tạo chiến dịch mới!");
      loadCampaigns();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa chiến dịch "${name}"?`)) return;
    const res = await deleteMarketingCampaignAction(id);
    if (res.success) {
      showToast("Đã xóa chiến dịch.");
      loadCampaigns();
    } else {
      alert(res.error || "Không thể xóa chiến dịch.");
    }
  };

  // Filtered List
  const filtered = campaigns.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const match = c.name.toLowerCase().includes(s) || (c.target_objective && c.target_objective.toLowerCase().includes(s));
      if (!match) return false;
    }
    return true;
  });

  const filteredCampaignIds = new Set(filtered.map((c) => c.id));
  const adsLeads = leads.filter((l) => {
    if (l.campaign_id && filteredCampaignIds.has(l.campaign_id)) return true;
    if (l.source === platform) return true;
    if (l.source_type === "ads") {
      const src = (l.source || "").toLowerCase();
      if (platform === "facebook_ads") return src.includes("facebook") || src.includes("fb");
      if (platform === "tiktok_ads") return src.includes("tiktok");
    }
    return false;
  });

  // Calculate Aggregates
  const totalCampaigns = filtered.length;
  const totalActualCost = filtered.reduce((s, c) => s + (Number(c.actual_cost) || 0), 0);
  const totalReachOrViews = filtered.reduce((s, c) => s + (platform === "facebook_ads" ? Number(c.reach) || 0 : Number(c.views) || 0), 0);
  const totalLeads = adsLeads.length;
  const totalConsulted = adsLeads.filter((l) => l.status === "consulted" || l.status === "converted" || l.status === "closed" || Boolean(l.consulted_at)).length;
  const totalConverted = adsLeads.filter((l) => l.status === "converted" || l.status === "closed" || Boolean(l.converted_at)).length;
  const totalOrders = adsLeads.filter((l) => l.status === "closed" || Boolean(l.order_id) || Boolean(l.closed_at)).length;

  // Safe CPL & Cost Per Order calculation
  const overallCPL = totalLeads > 0 ? Math.round(totalActualCost / totalLeads) : null;
  const overallCostPerOrder = totalOrders > 0 ? Math.round(totalActualCost / totalOrders) : null;

  // Linked metrics for currently editing item
  const editingCampLeads = editingItem ? leads.filter((l) => l.campaign_id === editingItem.id) : [];
  const editingLeadsCount = editingCampLeads.length;
  const editingConsultedCount = editingCampLeads.filter((l) => l.status === "consulted" || l.status === "converted" || l.status === "closed" || Boolean(l.consulted_at)).length;
  const editingOrdersCount = editingCampLeads.filter((l) => l.status === "closed" || Boolean(l.order_id) || Boolean(l.closed_at)).length;
  const parsedFormCost = Number(formActualCost) || 0;
  const computedFormCPL = editingLeadsCount > 0 ? Math.round(parsedFormCost / editingLeadsCount) : null;
  const computedFormCostPerOrder = editingOrdersCount > 0 ? Math.round(parsedFormCost / editingOrdersCount) : null;

  const formatMoney = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return new Intl.NumberFormat("vi-VN").format(val) + " đ";
  };
  const formatNumber = (val: number) => new Intl.NumberFormat("vi-VN").format(val);

  const getStatusBadge = (st: CampaignStatus) => {
    switch (st) {
      case "running":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Đang chạy</span>;
      case "paused":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Tạm dừng</span>;
      case "completed":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Hoàn thành</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Chuẩn bị</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg text-xs font-semibold animate-fade-in flex items-center gap-2">
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">Quản lý ngân sách, chi phí thực tế và tỷ lệ chuyển đổi đơn hàng</p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>+</span>
          <span>Tạo chiến dịch mới</span>
        </button>
      </div>

      {/* ================= KPI CARDS ADS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng chiến dịch</span>
          <p className="text-xl font-black text-slate-900 mt-0.5">{totalCampaigns}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1 lg:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Chi phí thực tế</span>
          <p className="text-base font-black text-rose-600 mt-0.5 truncate">{formatMoney(totalActualCost)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            {platform === "facebook_ads" ? "Lượt tiếp cận" : "Lượt xem video"}
          </span>
          <p className="text-xl font-black text-slate-900 mt-0.5">{formatNumber(totalReachOrViews)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Khách quan tâm</span>
          <p className="text-xl font-black text-amber-600 mt-0.5">{formatNumber(totalLeads)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Đã tư vấn</span>
          <p className="text-xl font-black text-sky-700 mt-0.5">{formatNumber(totalConsulted)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Chuyển đổi</span>
          <p className="text-xl font-black text-teal-700 mt-0.5">{formatNumber(totalConverted)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Đơn chốt</span>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{formatNumber(totalOrders)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">CPL trung bình</span>
          <p className="text-sm font-black text-primary mt-1 truncate">{formatMoney(overallCPL)}</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5 text-xs">
        {/* Preset Range row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-semibold mr-1">Khoảng thời gian:</span>
            {(
              [
                { id: "this_month", label: "Tháng này" },
                { id: "last_month", label: "Tháng trước" },
                { id: "7days", label: "7 ngày qua" },
                { id: "all", label: "Tất cả" },
                { id: "custom", label: "Tùy chỉnh" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handlePresetChange(t.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  presetRange === t.id
                    ? "bg-primary text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <input
              type="text"
              placeholder="Tìm theo tên chiến dịch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Detail Filter row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Chi nhánh:</span>
            <CustomSelect
              value={selectedBranch}
              onChange={(val) => setSelectedBranch(String(val))}
              options={[
                { value: "all", label: "Tất cả chi nhánh" },
                ...HATICO_BRANCHES.map((b) => ({ value: b.id, label: b.name })),
              ]}
              className="w-48"
              size="sm"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Trạng thái:</span>
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(String(val))}
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                { value: "running", label: "Đang chạy" },
                { value: "paused", label: "Tạm dừng" },
                { value: "completed", label: "Hoàn thành" },
                { value: "preparing", label: "Chuẩn bị" },
              ]}
              className="w-40"
              size="sm"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Thời gian bắt đầu:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPresetRange("custom");
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPresetRange("custom");
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* ================= BẢNG DANH SÁCH CHIẾN DỊCH ================= */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-2.5 px-3 min-w-[200px]">Tên chiến dịch</th>
                <th className="py-2.5 px-3">Chi nhánh</th>
                <th className="py-2.5 px-3">Thời gian chạy</th>
                <th className="py-2.5 px-3 text-right">Chi phí thực tế</th>
                <th className="py-2.5 px-3 text-right">
                  {platform === "facebook_ads" ? "Tiếp cận" : "Lượt xem"}
                </th>
                <th className="py-2.5 px-3 text-center">Khách QT</th>
                <th className="py-2.5 px-3 text-center">Tư vấn</th>
                <th className="py-2.5 px-3 text-center">Đơn chốt</th>
                <th className="py-2.5 px-3 text-right">CPL</th>
                <th className="py-2.5 px-3 text-center">Trạng thái</th>
                <th className="py-2.5 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                    Chưa có chiến dịch quảng cáo nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const bName = HATICO_BRANCHES.find((b) => b.id === c.branch_id)?.name || "Toàn quốc";
                  const campLeads = leads.filter((l) => l.campaign_id === c.id);
                  const leadsCount = campLeads.length;
                  const consultedCount = campLeads.filter(
                    (l) => l.status === "consulted" || l.status === "converted" || l.status === "closed" || Boolean(l.consulted_at)
                  ).length;
                  const ordersCount = campLeads.filter(
                    (l) => l.status === "closed" || Boolean(l.order_id) || Boolean(l.closed_at)
                  ).length;
                  const cpl = leadsCount > 0 ? Math.round(c.actual_cost / leadsCount) : null;
                  const dateRange = c.end_date ? `${c.start_date} → ${c.end_date}` : `Từ ${c.start_date}`;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{c.name}</p>
                        {c.target_objective && (
                          <p className="text-[10px] text-slate-400">{c.target_objective}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                        {bName}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {dateRange}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                        {formatMoney(c.actual_cost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {formatNumber(platform === "facebook_ads" ? c.reach : c.views)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-600">
                        {leadsCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-sky-700">
                        {consultedCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                        {ordersCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-primary whitespace-nowrap">
                        {formatMoney(cpl)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {getStatusBadge(c.status)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Sửa & Cập nhật số liệu"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id, c.name)}
                            className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa chiến dịch"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL TẠO / SỬA CHIẾN DỊCH ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-xl p-5 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingItem ? "Cập nhật chiến dịch quảng cáo" : `Tạo chiến dịch ${title}`}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tên chiến dịch *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chiến dịch Mooc Lồng Hatico T10 - Miền Nam"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Chi nhánh áp dụng</label>
                  <CustomSelect
                    portal
                    value={formBranchId}
                    onChange={(val) => setFormBranchId(String(val))}
                    options={HATICO_BRANCHES.map((b) => ({ value: b.id, label: b.name }))}
                    className="w-full"
                    size="md"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Trạng thái chiến dịch *</label>
                  <CustomSelect
                    portal
                    value={formStatus}
                    onChange={(val) => setFormStatus(val as any)}
                    options={[
                      { value: "running", label: "Đang chạy" },
                      { value: "paused", label: "Tạm dừng" },
                      { value: "completed", label: "Hoàn thành" },
                      { value: "preparing", label: "Chuẩn bị" },
                    ]}
                    className="w-full"
                    size="md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Mục tiêu chiến dịch</label>
                  <input
                    type="text"
                    placeholder="Tìm kiếm khách hàng, tin nhắn..."
                    value={formTargetObjective}
                    onChange={(e) => setFormTargetObjective(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                {platform === "facebook_ads" && (
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Fanpage chạy quảng cáo</label>
                    <CustomSelect
                      portal
                      value={formFanpage}
                      onChange={(val) => setFormFanpage(String(val))}
                      options={HATICO_FANPAGES.map((fp) => ({ value: fp, label: fp }))}
                      className="w-full"
                      size="md"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ngày kết thúc (tùy chọn)</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ngân sách dự kiến (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Chi phí đã chi thực tế (VNĐ) *</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    required
                    value={formActualCost}
                    onChange={(e) => setFormActualCost(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-rose-600 font-bold"
                  />
                </div>
              </div>

              {/* Phần số liệu hiệu quả và tự động tính CPL */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase">
                  Hiệu quả đo lường tiếp cận
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-500 text-[11px] font-medium mb-0.5">
                      {platform === "facebook_ads" ? "Lượt tiếp cận" : "Lượt xem video quảng cáo"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formReachOrViews}
                      onChange={(e) => setFormReachOrViews(e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Lượt tương tác</label>
                    <input
                      type="number"
                      min="0"
                      value={formInteractions}
                      onChange={(e) => setFormInteractions(e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                </div>

                {editingItem && (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/90 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span>Dữ liệu khách hàng liên kết chiến dịch:</span>
                      <span className="text-amber-600 font-bold">{editingLeadsCount} khách quan tâm</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Đã tư vấn: <strong className="text-sky-700">{editingConsultedCount}</strong> | Đơn hàng chốt: <strong className="text-emerald-700">{editingOrdersCount}</strong></span>
                      <span>
                        CPL: <strong className="text-primary">{formatMoney(computedFormCPL)}</strong> | Chi phí/đơn: <strong className="text-emerald-700">{formatMoney(computedFormCostPerOrder)}</strong>
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 italic">
                  * Khách hàng, đơn hàng, CPL và Chi phí/đơn được hệ thống tự động cập nhật từ phân hệ Khách hàng Marketing gắn theo Chiến dịch này.
                </p>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú về nhóm đối tượng, mẫu quảng cáo thắng (winner)..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Đang lưu..." : "Lưu chiến dịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  MarketingPlatform,
  MarketingContentItem,
  MarketingLeadItem,
  LeadSource,
  LeadStatus,
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  HATICO_BRANCHES,
  HATICO_FANPAGES,
} from "@/lib/marketing-types";
import {
  getMarketingContentsAction,
  saveMarketingContentAction,
  deleteMarketingContentAction,
  getMarketingLeadsAction,
  saveMarketingLeadAction,
  deleteMarketingLeadAction,
  checkDuplicateLeadAction,
} from "@/app/actions-marketing";
import { CustomSelect } from "@/components/custom-select";

interface ChannelReportPanelProps {
  platform: MarketingPlatform;
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

export function ChannelReportPanel({ platform, title }: ChannelReportPanelProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "contents" | "leads">("summary");
  const [items, setItems] = useState<MarketingContentItem[]>([]);
  const [leads, setLeads] = useState<MarketingLeadItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedFanpage, setSelectedFanpage] = useState<string>("all");
  const [presetRange, setPresetRange] = useState<PresetRange>("this_month");
  const [startDate, setStartDate] = useState<string>(() => getMonthRange(0).start);
  const [endDate, setEndDate] = useState<string>(() => getMonthRange(0).end);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Lead State
  const [leadSearchTerm, setLeadSearchTerm] = useState<string>("");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("all");
  const [leadPage, setLeadPage] = useState<number>(1);
  const [showLeadModal, setShowLeadModal] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<MarketingLeadItem | null>(null);

  // Form Lead State
  const [formLeadDate, setFormLeadDate] = useState(new Date().toISOString().split("T")[0]);
  const [formLeadName, setFormLeadName] = useState("");
  const [formLeadPhone, setFormLeadPhone] = useState("");
  const [formLeadAddress, setFormLeadAddress] = useState("");
  const [formLeadDemand, setFormLeadDemand] = useState("");
  const [formLeadSource, setFormLeadSource] = useState<LeadSource>(
    platform === "website" ? "website" : platform === "youtube" ? "youtube" : platform === "tiktok" ? "tiktok_organic" : "facebook_organic"
  );
  const [formLeadBranchId, setFormLeadBranchId] = useState<string>(HATICO_BRANCHES[0].id);
  const [formLeadHandlerBranchId, setFormLeadHandlerBranchId] = useState<string>(HATICO_BRANCHES[0].id);
  const [formLeadAssignedStaff, setFormLeadAssignedStaff] = useState("");
  const [formLeadStatus, setFormLeadStatus] = useState<LeadStatus>("new");
  const [formLeadOrderId, setFormLeadOrderId] = useState("");
  const [formLeadNotes, setFormLeadNotes] = useState("");
  const [leadDupWarning, setLeadDupWarning] = useState<string | null>(null);

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
  const [hasLoaded, setHasLoaded] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MarketingContentItem | null>(null);

  // Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formTitle, setFormTitle] = useState("");
  const [formContentType, setFormContentType] = useState(
    platform === "youtube" ? "Shorts" : platform === "tiktok" ? "Video ngắn" : platform === "website" ? "Bài website" : "Bài viết"
  );
  const [formTopic, setFormTopic] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formViews, setFormViews] = useState<number | string>(0);
  const [formInteractions, setFormInteractions] = useState<number | string>(0);
  const [formBranchId, setFormBranchId] = useState("");
  const [formFanpage, setFormFanpage] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = () => {
    startTransition(async () => {
      try {
        const [contentRes, leadsRes] = await Promise.all([
          getMarketingContentsAction(
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
        if (contentRes.data) {
          setItems(contentRes.data);
        }
        if (leadsRes.data) {
          setLeads(leadsRes.data);
        }
      } finally {
        setHasLoaded(true);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, [platform, selectedBranch, startDate, endDate]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormTitle("");
    setFormContentType(
      platform === "youtube" ? "Shorts" : platform === "tiktok" ? "Video ngắn" : platform === "website" ? "Bài website" : "Bài viết"
    );
    setFormTopic("");
    setFormLink("");
    setFormViews(0);
    setFormInteractions(0);
    setFormBranchId(HATICO_BRANCHES[0].id);
    setFormFanpage(HATICO_FANPAGES[0]);
    setFormNotes("");
    setShowModal(true);
  };

  const handleOpenEdit = (item: MarketingContentItem) => {
    setEditingItem(item);
    setFormDate(item.publish_date);
    setFormTitle(item.title);
    setFormContentType(item.content_type);
    setFormTopic(item.topic || "");
    setFormLink(item.link || "");
    setFormViews(item.views);
    setFormInteractions(item.interactions);
    setFormBranchId(item.branch_id || HATICO_BRANCHES[0].id);
    setFormFanpage(item.fanpage_name || HATICO_FANPAGES[0]);
    setFormNotes(item.notes || "");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("Vui lòng nhập tiêu đề!");
      return;
    }

    const payload: MarketingContentItem = {
      id: editingItem ? editingItem.id : "",
      platform,
      publish_date: formDate,
      title: formTitle.trim(),
      content_type: formContentType,
      topic: formTopic.trim() || undefined,
      link: formLink.trim() || undefined,
      views: Number(formViews) || 0,
      interactions: Number(formInteractions) || 0,
      leads_count: 0,
      consulted_count: 0,
      converted_count: 0,
      orders_count: 0,
      branch_id: formBranchId || undefined,
      fanpage_name: formFanpage || undefined,
      notes: formNotes.trim() || undefined,
    };

    const res = await saveMarketingContentAction(payload);
    if (res.error) {
      alert(res.error);
    } else {
      setShowModal(false);
      showToast(editingItem ? "Đã cập nhật nội dung thành công!" : "Đã thêm nội dung mới!");
      loadData();
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${itemTitle}"?`)) return;
    const res = await deleteMarketingContentAction(id);
    if (res.success) {
      showToast("Đã xóa nội dung.");
      loadData();
    } else {
      alert(res.error || "Không thể xóa nội dung.");
    }
  };

  const handleOpenAddLead = () => {
    setEditingLead(null);
    setFormLeadDate(new Date().toISOString().split("T")[0]);
    setFormLeadName("");
    setFormLeadPhone("");
    setFormLeadAddress("");
    setFormLeadDemand("");
    setFormLeadSource(
      platform === "website"
        ? "website"
        : platform === "youtube"
        ? "youtube"
        : platform === "tiktok"
        ? "tiktok_organic"
        : "facebook_organic"
    );
    setFormLeadBranchId(HATICO_BRANCHES[0].id);
    setFormLeadHandlerBranchId(HATICO_BRANCHES[0].id);
    setFormLeadAssignedStaff("");
    setFormLeadStatus("new");
    setFormLeadOrderId("");
    setFormLeadNotes("");
    setLeadDupWarning(null);
    setShowLeadModal(true);
  };

  const handleOpenEditLead = (lead: MarketingLeadItem) => {
    setEditingLead(lead);
    setFormLeadDate(lead.lead_date);
    setFormLeadName(lead.full_name);
    setFormLeadPhone(lead.phone);
    setFormLeadAddress(lead.address || "");
    setFormLeadDemand(lead.demand || "");
    setFormLeadSource(lead.source);
    setFormLeadBranchId(lead.branch_id || HATICO_BRANCHES[0].id);
    setFormLeadHandlerBranchId(lead.handler_branch_id || HATICO_BRANCHES[0].id);
    setFormLeadAssignedStaff(lead.assigned_staff_name || "");
    setFormLeadStatus(lead.status);
    setFormLeadOrderId(lead.order_id || "");
    setFormLeadNotes(lead.notes || "");
    setLeadDupWarning(null);
    setShowLeadModal(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLeadName.trim() || !formLeadPhone.trim()) {
      alert("Vui lòng nhập Họ tên và Số điện thoại khách hàng!");
      return;
    }
    if (formLeadStatus === "closed" && !formLeadOrderId.trim()) {
      alert("Khách hàng ở trạng thái Chốt đơn bắt buộc phải có Mã đơn hàng / Hợp đồng!");
      return;
    }

    const payload: MarketingLeadItem = {
      id: editingLead ? editingLead.id : "",
      lead_date: formLeadDate,
      full_name: formLeadName.trim(),
      phone: formLeadPhone.trim(),
      address: formLeadAddress.trim() || undefined,
      demand: formLeadDemand.trim() || undefined,
      source: formLeadSource,
      source_type: formLeadSource.endsWith("_ads") ? "ads" : "organic",
      branch_id: formLeadBranchId || undefined,
      handler_branch_id: formLeadHandlerBranchId || undefined,
      assigned_staff_name: formLeadAssignedStaff.trim() || undefined,
      status: formLeadStatus,
      order_id: formLeadOrderId.trim() || undefined,
      notes: formLeadNotes.trim() || undefined,
    };

    const res = await saveMarketingLeadAction(payload);
    if (res.error) {
      alert(res.error);
    } else {
      setShowLeadModal(false);
      showToast(editingLead ? "Đã cập nhật khách hàng!" : "Đã tạo khách hàng mới!");
      loadData();
    }
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa khách hàng "${name}"?`)) return;
    const res = await deleteMarketingLeadAction(id);
    if (res.success) {
      showToast("Đã xóa khách hàng.");
      loadData();
    } else {
      alert(res.error || "Không thể xóa khách hàng.");
    }
  };

  const handleLeadPhoneBlur = async () => {
    if (!formLeadPhone || formLeadPhone.length < 9) {
      setLeadDupWarning(null);
      return;
    }
    const res = await checkDuplicateLeadAction(formLeadPhone, editingLead ? editingLead.id : undefined);
    if (res.isDuplicate && res.existingLead) {
      setLeadDupWarning(
        `Cảnh báo: SĐT này đã tồn tại (${res.existingLead.full_name} - ${res.existingLead.lead_date} - ${LEAD_STATUS_LABELS[res.existingLead.status as LeadStatus] || res.existingLead.status}).`
      );
    } else {
      setLeadDupWarning(null);
    }
  };

  // Filtered Items for Content Table
  const filteredItems = items.filter((item) => {
    if (selectedFanpage !== "all" && item.fanpage_name !== selectedFanpage) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const match =
        item.title.toLowerCase().includes(s) ||
        (item.topic && item.topic.toLowerCase().includes(s)) ||
        (item.fanpage_name && item.fanpage_name.toLowerCase().includes(s));
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Tab A: Tổng hợp hiệu quả
  const totalPosts = filteredItems.length;
  const totalViews = filteredItems.reduce((s, i) => s + (Number(i.views) || 0), 0);
  const totalInteractions = filteredItems.reduce((s, i) => s + (Number(i.interactions) || 0), 0);

  // Lấy dữ liệu khách hàng & chuyển đổi thực tế từ phân hệ Khách hàng Marketing
  const channelLeads = leads.filter((l) => {
    const src = (l.source || "").toLowerCase();
    if (platform === "facebook") return src.includes("facebook") || src.includes("fb");
    if (platform === "tiktok") return src.includes("tiktok");
    if (platform === "youtube") return src.includes("youtube");
    if (platform === "website") return src.includes("web");
    return false;
  });

  const filteredLeads = channelLeads.filter((l) => {
    if (leadStatusFilter !== "all" && l.status !== leadStatusFilter) return false;
    if (leadSearchTerm) {
      const s = leadSearchTerm.toLowerCase();
      const match =
        l.full_name.toLowerCase().includes(s) ||
        l.phone.toLowerCase().includes(s) ||
        (l.demand && l.demand.toLowerCase().includes(s)) ||
        (l.address && l.address.toLowerCase().includes(s));
      if (!match) return false;
    }
    return true;
  });

  const totalLeadPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = filteredLeads.slice((leadPage - 1) * pageSize, leadPage * pageSize);

  const getLeadStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case "new":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Mới quan tâm</span>;
      case "consulted":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">Đã tư vấn</span>;
      case "discussing":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Đang trao đổi</span>;
      case "converted":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">Đã chuyển đổi</span>;
      case "closed":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã chốt đơn</span>;
      case "no_demand":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Không có nhu cầu</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">Khác</span>;
    }
  };

  const totalLeads = channelLeads.length;
  const totalConsulted = channelLeads.filter(
    (l) => l.status === "consulted" || l.status === "converted" || l.status === "closed" || Boolean(l.consulted_at)
  ).length;
  const totalConverted = channelLeads.filter(
    (l) => l.status === "converted" || l.status === "closed" || Boolean(l.converted_at)
  ).length;
  const totalOrders = channelLeads.filter(
    (l) => l.status === "closed" || Boolean(l.order_id) || Boolean(l.closed_at)
  ).length;

  // Category breakdown
  const regularPostsCount = filteredItems.filter((i) => i.content_type === "Bài viết" || i.content_type === "Video dài").length;
  const shortVideosCount = filteredItems.filter((i) => i.content_type === "Reels" || i.content_type === "Shorts" || i.content_type === "Video ngắn").length;

  const formatNumber = (num: number) => new Intl.NumberFormat("vi-VN").format(num);
  const formatMetric = (val: number | null | undefined) => {
    if (!hasLoaded || isPending) return "—";
    return formatNumber(val || 0);
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

      {/* Header & Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">Quản lý hiệu quả kênh, bài đăng xuất bản và khách hàng phát sinh</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/70">
            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                activeTab === "summary" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tổng hợp hiệu quả
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contents")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                activeTab === "contents" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Danh sách nội dung ({!hasLoaded || isPending ? "—" : filteredItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("leads")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                activeTab === "leads" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Khách hàng kênh ({!hasLoaded || isPending ? "—" : channelLeads.length})
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenAddLead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <span>+</span>
              <span>Thêm khách hàng</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <span>+</span>
              <span>Thêm nội dung</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5 text-xs">
        {/* Preset Range Row */}
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

          {activeTab === "contents" && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Tìm theo tiêu đề, chủ đề..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-56 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {activeTab === "leads" && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <CustomSelect
                value={leadStatusFilter}
                onChange={(val) => setLeadStatusFilter(String(val))}
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  ...Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v })),
                ]}
                className="w-36"
                size="sm"
              />
              <input
                type="text"
                placeholder="Tìm theo họ tên, SĐT, nhu cầu..."
                value={leadSearchTerm}
                onChange={(e) => setLeadSearchTerm(e.target.value)}
                className="w-full sm:w-56 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>

        {/* Detail Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          {platform === "facebook" && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Fanpage:</span>
              <CustomSelect
                value={selectedFanpage}
                onChange={(val) => setSelectedFanpage(String(val))}
                options={[
                  { value: "all", label: "Tất cả Fanpage" },
                  ...HATICO_FANPAGES.map((fp) => ({ value: fp, label: fp })),
                ]}
                className="w-48"
                size="sm"
              />
            </div>
          )}

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
            <span className="text-slate-500 font-medium">Từ ngày:</span>
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

      {/* ================= TAB A: TỔNG HỢP HIỆU QUẢ ================= */}
      {activeTab === "summary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {platform === "website" ? "Tổng bài viết" : "Tổng nội dung đã đăng"}
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {!hasLoaded || isPending ? "—" : formatNumber(totalPosts)}
              </p>
              {hasLoaded && !isPending && platform === "facebook" && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {regularPostsCount} bài viết · {shortVideosCount} Reels/Video
                </p>
              )}
              {hasLoaded && !isPending && platform === "youtube" && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {regularPostsCount} video dài · {shortVideosCount} Shorts
                </p>
              )}
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {platform === "website" ? "Tổng lượt xem trang" : "Tổng lượt xem"}
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">{formatMetric(totalViews)}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {platform === "website" ? "Khách đăng ký/Liên hệ" : "Tổng tương tác"}
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {formatMetric(platform === "website" ? totalLeads : totalInteractions)}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Khách quan tâm</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{formatMetric(totalLeads)}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Khách được tư vấn</span>
              <p className="text-2xl font-black text-sky-700 mt-1">{formatMetric(totalConsulted)}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Khách chuyển đổi</span>
              <p className="text-2xl font-black text-teal-700 mt-1">{formatMetric(totalConverted)}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đơn hàng chốt</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{formatMetric(totalOrders)}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tỷ lệ chốt / quan tâm</span>
              <p className="text-xl font-black text-primary mt-1">
                {!hasLoaded || isPending
                  ? "—"
                  : totalLeads > 0
                  ? `${((totalOrders / totalLeads) * 100).toFixed(1)}%`
                  : "0%"}
              </p>
            </div>
          </div>

          {/* Phần Khách hàng phát sinh từ kênh này */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Khách hàng mới nhất từ {title} ({!hasLoaded || isPending ? "—" : channelLeads.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddLead}
                  className="px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg border border-primary/20 transition-colors cursor-pointer"
                >
                  + Thêm khách hàng
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("leads")}
                  className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Xem toàn bộ ({!hasLoaded || isPending ? "—" : channelLeads.length}) →
                </button>
              </div>
            </div>

            {channelLeads.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                Chưa có khách hàng nào phát sinh từ kênh này trong khoảng thời gian đã chọn.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2 px-3">Ngày</th>
                      <th className="py-2 px-3">Họ tên</th>
                      <th className="py-2 px-3">Số điện thoại</th>
                      <th className="py-2 px-3">Nhu cầu</th>
                      <th className="py-2 px-3">Chi nhánh</th>
                      <th className="py-2 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {channelLeads.slice(0, 5).map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 whitespace-nowrap text-slate-500">{l.lead_date}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{l.full_name}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{l.phone}</td>
                        <td className="py-2 px-3 text-slate-600 truncate max-w-[180px]">{l.demand || "—"}</td>
                        <td className="py-2 px-3 text-slate-600">
                          {HATICO_BRANCHES.find((b) => b.id === l.branch_id)?.name || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">{getLeadStatusBadge(l.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB B: DANH SÁCH NỘI DUNG ================= */}
      {activeTab === "contents" && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3">Ngày đăng</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Tiêu đề nội dung</th>
                  <th className="py-2.5 px-3">Loại</th>
                  <th className="py-2.5 px-3">Chủ đề</th>
                  {platform === "facebook" && <th className="py-2.5 px-3">Fanpage</th>}
                  <th className="py-2.5 px-3 text-right">Lượt xem</th>
                  {platform !== "website" && <th className="py-2.5 px-3 text-right">Tương tác</th>}
                  <th className="py-2.5 px-3 text-center">Khách</th>
                  <th className="py-2.5 px-3 text-center">Đơn</th>
                  <th className="py-2.5 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                      Chưa có nội dung nào trong khoảng thời gian hoặc điều kiện đã chọn.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                        {item.publish_date}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.link ? (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 group"
                          >
                            <span>{item.title}</span>
                            <span className="text-[10px] text-slate-400 group-hover:text-primary">↗</span>
                          </a>
                        ) : (
                          item.title
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.content_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {item.topic || "—"}
                      </td>
                      {platform === "facebook" && (
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {item.fanpage_name || "—"}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {formatMetric(Number(item.views))}
                      </td>
                      {platform !== "website" && (
                        <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                          {formatMetric(Number(item.interactions))}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-center font-bold text-amber-600">
                        {!hasLoaded || isPending ? "—" : leads.filter((l) => l.content_id === item.id).length}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                        {!hasLoaded || isPending ? "—" : leads.filter((l) => l.content_id === item.id && (l.status === "closed" || Boolean(l.order_id) || Boolean(l.closed_at))).length}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Sửa nội dung & cập nhật số liệu"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.title)}
                            className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa nội dung"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <span>
                Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredItems.length)} của {filteredItems.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-2 py-1 rounded-md bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  Trang trước
                </button>
                <span className="px-2 font-bold text-slate-800">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-2 py-1 rounded-md bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB C: DANH SÁCH KHÁCH HÀNG ================= */}
      {activeTab === "leads" && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3">Ngày phát sinh</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Họ tên khách hàng</th>
                  <th className="py-2.5 px-3">Số điện thoại</th>
                  <th className="py-2.5 px-3">Địa chỉ / Tỉnh</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Nhu cầu</th>
                  <th className="py-2.5 px-3">Nguồn chi tiết</th>
                  <th className="py-2.5 px-3">Chi nhánh</th>
                  <th className="py-2.5 px-3 text-center">Trạng thái</th>
                  <th className="py-2.5 px-3">Đơn hàng chốt</th>
                  <th className="py-2.5 px-3">Phụ trách</th>
                  <th className="py-2.5 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                      Chưa có khách hàng nào từ kênh này theo điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-medium">
                        {lead.lead_date}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{lead.full_name}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800">{lead.phone}</td>
                      <td className="py-2.5 px-3 text-slate-600">{lead.address || "—"}</td>
                      <td className="py-2.5 px-3 text-slate-700">{lead.demand || "—"}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {LEAD_SOURCE_LABELS[lead.source as LeadSource] || lead.source}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {HATICO_BRANCHES.find((b) => b.id === lead.branch_id)?.name || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center">{getLeadStatusBadge(lead.status)}</td>
                      <td className="py-2.5 px-3">
                        {lead.order_id ? (
                          <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {lead.order_id}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{lead.assigned_staff_name || "—"}</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditLead(lead)}
                            className="p-1 text-slate-500 hover:text-primary transition-colors cursor-pointer"
                            title="Chỉnh sửa khách hàng"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead.id, lead.full_name)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Xóa khách hàng"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Lead Pagination */}
          {totalLeadPages > 1 && (
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <span>
                Hiển thị {(leadPage - 1) * pageSize + 1} - {Math.min(leadPage * pageSize, filteredLeads.length)} của {filteredLeads.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={leadPage <= 1}
                  onClick={() => setLeadPage((p) => p - 1)}
                  className="px-2 py-1 rounded-md bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  Trang trước
                </button>
                <span className="px-2 font-bold text-slate-800">
                  {leadPage} / {totalLeadPages}
                </span>
                <button
                  type="button"
                  disabled={leadPage >= totalLeadPages}
                  onClick={() => setLeadPage((p) => p + 1)}
                  className="px-2 py-1 rounded-md bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL THÊM / SỬA NỘI DUNG ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-xl p-5 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingItem ? "Chỉnh sửa & Cập nhật số liệu" : `Thêm nội dung ${title}`}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ngày đăng *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Loại nội dung *</label>
                  <CustomSelect
                    portal
                    value={formContentType}
                    onChange={(v) => setFormContentType(String(v))}
                    options={
                      platform === "facebook"
                        ? [
                            { value: "Bài viết", label: "Bài viết" },
                            { value: "Reels", label: "Reels" },
                            { value: "Video", label: "Video" },
                          ]
                        : platform === "tiktok"
                        ? [{ value: "Video ngắn", label: "Video ngắn" }]
                        : platform === "youtube"
                        ? [
                            { value: "Shorts", label: "Shorts" },
                            { value: "Video dài", label: "Video dài" },
                          ]
                        : [{ value: "Bài website", label: "Bài website" }]
                    }
                    className="w-full"
                    size="md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tiêu đề nội dung *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên bài viết, tiêu đề video..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Chủ đề / Chuyên mục</label>
                  <input
                    type="text"
                    placeholder="Bàn giao xe, kiến thức, ưu đãi..."
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Link bài viết / video</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {platform === "facebook" && (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Fanpage đăng bài</label>
                  <CustomSelect
                    portal
                    value={formFanpage}
                    onChange={(v) => setFormFanpage(String(v))}
                    options={HATICO_FANPAGES.map((fp) => ({ value: fp, label: fp }))}
                    className="w-full"
                    size="md"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Chi nhánh liên quan</label>
                <CustomSelect
                  portal
                  value={formBranchId}
                  onChange={(v) => setFormBranchId(String(v))}
                  options={HATICO_BRANCHES.map((b) => ({ value: b.id, label: b.name }))}
                  className="w-full"
                  size="md"
                />
              </div>

              {/* Phần số liệu thực tế */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase">
                  Số liệu thực tế đạt được
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Lượt xem</label>
                    <input
                      type="number"
                      min="0"
                      value={formViews}
                      onChange={(e) => setFormViews(e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                  {platform !== "website" && (
                    <div>
                      <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Tương tác</label>
                      <input
                        type="number"
                        min="0"
                        value={formInteractions}
                        onChange={(e) => setFormInteractions(e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  * Số lượng khách hàng và chuyển đổi được tự động ghi nhận theo nguồn từ phân hệ Khách hàng Marketing.
                </p>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú thêm về nội dung, điểm cần lưu ý..."
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
                  {isPending ? "Đang lưu..." : "Lưu nội dung"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL THÊM / SỬA KHÁCH HÀNG ================= */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-xl p-5 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingLead ? "Chỉnh sửa thông tin khách hàng" : `Tạo khách hàng mới từ ${title}`}
              </h3>
              <button
                type="button"
                onClick={() => setShowLeadModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {leadDupWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-start gap-2">
                <span>⚠️</span>
                <span>{leadDupWarning}</span>
              </div>
            )}

            <form onSubmit={handleSaveLead} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ngày phát sinh *</label>
                  <input
                    type="date"
                    required
                    value={formLeadDate}
                    onChange={(e) => setFormLeadDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nguồn khách hàng *</label>
                  <CustomSelect
                    portal
                    value={formLeadSource}
                    onChange={(v) => setFormLeadSource(v as LeadSource)}
                    options={
                      platform === "facebook"
                        ? [
                            { value: "facebook_organic", label: "Facebook Organic" },
                            { value: "facebook_ads", label: "Facebook Ads" },
                          ]
                        : platform === "tiktok"
                        ? [
                            { value: "tiktok_organic", label: "TikTok Organic" },
                            { value: "tiktok_ads", label: "TikTok Ads" },
                          ]
                        : platform === "youtube"
                        ? [{ value: "youtube", label: "YouTube" }]
                        : [{ value: "website", label: "Website" }]
                    }
                    className="w-full"
                    size="md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Họ tên khách hàng *</label>
                  <input
                    type="text"
                    required
                    value={formLeadName}
                    onChange={(e) => setFormLeadName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    value={formLeadPhone}
                    onChange={(e) => setFormLeadPhone(e.target.value)}
                    onBlur={handleLeadPhoneBlur}
                    placeholder="VD: 0912345678"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Địa chỉ / Tỉnh</label>
                  <input
                    type="text"
                    value={formLeadAddress}
                    onChange={(e) => setFormLeadAddress(e.target.value)}
                    placeholder="VD: Hải Phòng, Hà Nội..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nhu cầu / Sản phẩm</label>
                  <input
                    type="text"
                    value={formLeadDemand}
                    onChange={(e) => setFormLeadDemand(e.target.value)}
                    placeholder="VD: Mooc ben, Mooc xương, Vỏ xe..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Chi nhánh tạo nguồn</label>
                  <CustomSelect
                    portal
                    value={formLeadBranchId}
                    onChange={(v) => setFormLeadBranchId(String(v))}
                    options={HATICO_BRANCHES.map((b) => ({ value: b.id, label: b.name }))}
                    className="w-full"
                    size="md"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Chi nhánh tiếp nhận</label>
                  <CustomSelect
                    portal
                    value={formLeadHandlerBranchId}
                    onChange={(v) => setFormLeadHandlerBranchId(String(v))}
                    options={HATICO_BRANCHES.map((b) => ({ value: b.id, label: b.name }))}
                    className="w-full"
                    size="md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Trạng thái xử lý</label>
                  <CustomSelect
                    portal
                    value={formLeadStatus}
                    onChange={(v) => setFormLeadStatus(v as LeadStatus)}
                    options={Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    className="w-full"
                    size="md"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Mã đơn hàng {formLeadStatus === "closed" && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formLeadOrderId}
                    onChange={(e) => setFormLeadOrderId(e.target.value)}
                    placeholder="VD: DH-2026-001"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nhân viên phụ trách</label>
                  <input
                    type="text"
                    value={formLeadAssignedStaff}
                    onChange={(e) => setFormLeadAssignedStaff(e.target.value)}
                    placeholder="Tên nhân viên Sales/Marketing"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={formLeadNotes}
                    onChange={(e) => setFormLeadNotes(e.target.value)}
                    placeholder="Ghi chú thêm về cuộc gọi, hẹn gặp..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Đang lưu..." : "Lưu khách hàng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

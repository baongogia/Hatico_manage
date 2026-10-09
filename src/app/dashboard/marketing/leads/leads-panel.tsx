"use client";

import React, { useState, useEffect, useTransition } from "react";
import ExcelJS from "exceljs";
import {
  MarketingLeadItem,
  LeadSource,
  LeadStatus,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  HATICO_BRANCHES,
} from "@/lib/marketing-types";
import {
  getMarketingLeadsAction,
  saveMarketingLeadAction,
  deleteMarketingLeadAction,
  checkDuplicateLeadAction,
  getMarketingCampaignsAction,
} from "@/app/actions-marketing";

export function LeadsPanel() {
  const [leads, setLeads] = useState<MarketingLeadItem[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [canViewFullPhone, setCanViewFullPhone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MarketingLeadItem | null>(null);

  // Form Fields
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formDemand, setFormDemand] = useState("");
  const [formSource, setFormSource] = useState<LeadSource>("facebook_organic");
  const [formCampaignId, setFormCampaignId] = useState("");
  const [formBranchId, setFormBranchId] = useState(""); // Chi nhánh tạo nguồn
  const [formHandlerBranchId, setFormHandlerBranchId] = useState(""); // Chi nhánh tiếp nhận
  const [formAssignedStaff, setFormAssignedStaff] = useState("");
  const [formStatus, setFormStatus] = useState<LeadStatus>("new");
  const [formNotes, setFormNotes] = useState("");

  // Duplicate Check Alert State
  const [dupWarning, setDupWarning] = useState<string | null>(null);

  // Campaigns list for dropdown linking
  const [availableCampaigns, setAvailableCampaigns] = useState<{ id: string; name: string }[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadLeads = () => {
    startTransition(async () => {
      const res = await getMarketingLeadsAction(
        sourceFilter === "all" ? undefined : sourceFilter,
        branchFilter === "all" ? undefined : branchFilter,
        startDate || undefined,
        endDate || undefined,
        searchTerm || undefined
      );
      if (res.data) {
        setLeads(res.data);
        setCanViewFullPhone(!!res.canViewFullPhone);
      }
    });
  };

  useEffect(() => {
    loadLeads();
  }, [sourceFilter, branchFilter, startDate, endDate, searchTerm]);

  // Load campaigns for selector
  useEffect(() => {
    getMarketingCampaignsAction().then((res) => {
      if (res.data) {
        setAvailableCampaigns(res.data.map((c) => ({ id: c.id, name: c.name })));
      }
    });
  }, []);

  const handlePhoneBlur = async () => {
    if (!formPhone || formPhone.length < 9) {
      setDupWarning(null);
      return;
    }
    const res = await checkDuplicateLeadAction(formPhone, editingItem ? editingItem.id : undefined);
    if (res.isDuplicate && res.existingLead) {
      setDupWarning(
        `Cảnh báo: SĐT này đã tồn tại trên hệ thống (${res.existingLead.full_name} - ${res.existingLead.lead_date} - ${LEAD_STATUS_LABELS[res.existingLead.status as LeadStatus] || res.existingLead.status}).`
      );
    } else {
      setDupWarning(null);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormName("");
    setFormPhone("");
    setFormAddress("");
    setFormDemand("");
    setFormSource("facebook_organic");
    setFormCampaignId("");
    setFormBranchId(HATICO_BRANCHES[0].id);
    setFormHandlerBranchId(HATICO_BRANCHES[0].id);
    setFormAssignedStaff("");
    setFormStatus("new");
    setFormNotes("");
    setDupWarning(null);
    setShowModal(true);
  };

  const handleOpenEdit = (lead: MarketingLeadItem) => {
    setEditingItem(lead);
    setFormDate(lead.lead_date);
    setFormName(lead.full_name);
    setFormPhone(lead.phone);
    setFormAddress(lead.address || "");
    setFormDemand(lead.demand || "");
    setFormSource(lead.source);
    setFormCampaignId(lead.campaign_id || "");
    setFormBranchId(lead.branch_id || HATICO_BRANCHES[0].id);
    setFormHandlerBranchId(lead.handler_branch_id || HATICO_BRANCHES[0].id);
    setFormAssignedStaff(lead.assigned_staff_name || "");
    setFormStatus(lead.status);
    setFormNotes(lead.notes || "");
    setDupWarning(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      alert("Họ tên và Số điện thoại là bắt buộc!");
      return;
    }

    const payload: MarketingLeadItem = {
      id: editingItem ? editingItem.id : "",
      lead_date: formDate,
      full_name: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim() || undefined,
      demand: formDemand.trim() || undefined,
      source: formSource,
      campaign_id: formCampaignId || undefined,
      branch_id: formBranchId || undefined,
      handler_branch_id: formHandlerBranchId || undefined,
      assigned_staff_name: formAssignedStaff.trim() || undefined,
      status: formStatus,
      notes: formNotes.trim() || undefined,
    };

    const res = await saveMarketingLeadAction(payload);
    if (res.error) {
      alert(res.error);
    } else {
      setShowModal(false);
      showToast(editingItem ? "Đã cập nhật khách hàng!" : "Đã tạo khách hàng mới!");
      loadLeads();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa khách hàng "${name}"?`)) return;
    const res = await deleteMarketingLeadAction(id);
    if (res.success) {
      showToast("Đã xóa khách hàng.");
      loadLeads();
    } else {
      alert(res.error || "Không thể xóa khách hàng.");
    }
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Khách hàng Marketing");

    ws.columns = [
      { header: "Ngày phát sinh", key: "lead_date", width: 14 },
      { header: "Họ và tên", key: "full_name", width: 22 },
      { header: "Số điện thoại", key: "phone", width: 16 },
      { header: "Địa chỉ / Tỉnh", key: "address", width: 20 },
      { header: "Nhu cầu", key: "demand", width: 26 },
      { header: "Nguồn tiếp cận", key: "source", width: 18 },
      { header: "Chi nhánh nguồn", key: "branch", width: 22 },
      { header: "Chi nhánh tiếp nhận", key: "handler_branch", width: 22 },
      { header: "Trạng thái", key: "status", width: 18 },
      { header: "Phụ trách", key: "assigned", width: 18 },
      { header: "Ghi chú", key: "notes", width: 26 },
    ];

    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2D59" } };

    leads.forEach((l) => {
      const bName = HATICO_BRANCHES.find((b) => b.id === l.branch_id)?.name || "—";
      const hName = HATICO_BRANCHES.find((b) => b.id === l.handler_branch_id)?.name || "—";
      ws.addRow({
        lead_date: l.lead_date,
        full_name: l.full_name,
        phone: l.phone,
        address: l.address || "—",
        demand: l.demand || "—",
        source: LEAD_SOURCE_LABELS[l.source] || l.source,
        branch: bName,
        handler_branch: hName,
        status: LEAD_STATUS_LABELS[l.status] || l.status,
        assigned: l.assigned_staff_name || "—",
        notes: l.notes || "",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Danh_sach_khach_hang_Marketing_Hatico_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (st: LeadStatus) => {
    switch (st) {
      case "new":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Mới quan tâm</span>;
      case "consulted":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">Đã tư vấn</span>;
      case "discussing":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Đang trao đổi</span>;
      case "converted":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">Đã chuyển đổi</span>;
      case "closed":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã chốt đơn</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Không có nhu cầu</span>;
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
          <h2 className="text-base font-bold text-slate-900">Quản lý Khách hàng Marketing</h2>
          <p className="text-xs text-slate-500">
            Dữ liệu tập trung chống trùng lặp, theo dõi phễu từ quan tâm đến chốt đơn ({filteredLeads.length} khách)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <span>↓</span>
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <span>+</span>
            <span>Tạo khách hàng mới</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Nguồn:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="all">Tất cả nguồn</option>
              {Object.entries(LEAD_SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Chi nhánh:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="all">Tất cả chi nhánh</option>
              {HATICO_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Ngày:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>
        </div>

        <div>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-60 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          />
        </div>
      </div>

      {/* ================= BẢNG KHÁCH HÀNG ================= */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-2.5 px-3">Ngày phát sinh</th>
                <th className="py-2.5 px-3 min-w-[130px]">Họ tên</th>
                <th className="py-2.5 px-3">Số điện thoại</th>
                <th className="py-2.5 px-3">Địa chỉ / Tỉnh</th>
                <th className="py-2.5 px-3 min-w-[140px]">Nhu cầu</th>
                <th className="py-2.5 px-3">Nguồn</th>
                <th className="py-2.5 px-3">Chi nhánh</th>
                <th className="py-2.5 px-3 text-center">Trạng thái</th>
                <th className="py-2.5 px-3">Phụ trách</th>
                <th className="py-2.5 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                    Chưa có khách hàng nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const bName = HATICO_BRANCHES.find((b) => b.id === lead.branch_id)?.name || "—";
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                        {lead.lead_date}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {lead.full_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                        {lead.phone}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {lead.address || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        {lead.demand || "—"}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {LEAD_SOURCE_LABELS[lead.source] || lead.source}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {bName}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-medium">
                        {lead.assigned_staff_name || "Chưa gán"}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lead)}
                            className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Sửa thông tin & trạng thái"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(lead.id, lead.full_name)}
                            className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa khách hàng"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <span>
              Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredLeads.length)} của {filteredLeads.length}
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

      {/* ================= MODAL TẠO / SỬA KHÁCH HÀNG ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-xl p-5 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingItem ? "Cập nhật thông tin khách hàng" : "Thêm khách hàng Marketing"}
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
                  <label className="block text-slate-600 font-semibold mb-1">Ngày phát sinh *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Trạng thái khách hàng *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                  >
                    {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Họ và tên khách hàng *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    placeholder="09..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    onBlur={handlePhoneBlur}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              {dupWarning && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-[11px] font-medium leading-relaxed">
                  ⚠️ {dupWarning}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Địa chỉ / Tỉnh thành</label>
                  <input
                    type="text"
                    placeholder="Đồng Nai, Đắk Lắk, Hà Nội..."
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nhu cầu cụ thể</label>
                  <input
                    type="text"
                    placeholder="Mooc ben, mooc lồng 3 trục, phụ tùng..."
                    value={formDemand}
                    onChange={(e) => setFormDemand(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nguồn khách hàng *</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    {Object.entries(LEAD_SOURCE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {(formSource === "facebook_ads" || formSource === "tiktok_ads") && (
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Liên kết chiến dịch Ads</label>
                    <select
                      value={formCampaignId}
                      onChange={(e) => setFormCampaignId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    >
                      <option value="">-- Không liên kết --</option>
                      {availableCampaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Chi nhánh tạo nguồn *</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    {HATICO_BRANCHES.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Chi nhánh tiếp nhận xử lý *</label>
                  <select
                    value={formHandlerBranchId}
                    onChange={(e) => setFormHandlerBranchId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    {HATICO_BRANCHES.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nhân sự phụ trách / tư vấn</label>
                <input
                  type="text"
                  placeholder="Tên nhân viên kinh doanh / CSKH phụ trách..."
                  value={formAssignedStaff}
                  onChange={(e) => setFormAssignedStaff(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú trao đổi</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú về nội dung trao đổi, thời gian hẹn báo giá hoặc lý do..."
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

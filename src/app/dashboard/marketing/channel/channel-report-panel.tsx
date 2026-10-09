"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  MarketingPlatform,
  MarketingContentItem,
  HATICO_BRANCHES,
  HATICO_FANPAGES,
} from "@/lib/marketing-types";
import {
  getMarketingContentsAction,
  saveMarketingContentAction,
  deleteMarketingContentAction,
} from "@/app/actions-marketing";

interface ChannelReportPanelProps {
  platform: MarketingPlatform;
  title: string;
}

export function ChannelReportPanel({ platform, title }: ChannelReportPanelProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "contents">("summary");
  const [items, setItems] = useState<MarketingContentItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedFanpage, setSelectedFanpage] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [isPending, startTransition] = useTransition();
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
  const [formLeads, setFormLeads] = useState<number | string>(0);
  const [formConsulted, setFormConsulted] = useState<number | string>(0);
  const [formConverted, setFormConverted] = useState<number | string>(0);
  const [formOrders, setFormOrders] = useState<number | string>(0);
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
      const res = await getMarketingContentsAction(
        platform,
        selectedBranch === "all" ? undefined : selectedBranch,
        startDate || undefined,
        endDate || undefined
      );
      if (res.data) {
        setItems(res.data);
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
    setFormLeads(0);
    setFormConsulted(0);
    setFormConverted(0);
    setFormOrders(0);
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
    setFormLeads(item.leads_count);
    setFormConsulted(item.consulted_count);
    setFormConverted(item.converted_count);
    setFormOrders(item.orders_count);
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
      leads_count: Number(formLeads) || 0,
      consulted_count: Number(formConsulted) || 0,
      converted_count: Number(formConverted) || 0,
      orders_count: Number(formOrders) || 0,
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
  const totalLeads = filteredItems.reduce((s, i) => s + (Number(i.leads_count) || 0), 0);
  const totalConsulted = filteredItems.reduce((s, i) => s + (Number(i.consulted_count) || 0), 0);
  const totalConverted = filteredItems.reduce((s, i) => s + (Number(i.converted_count) || 0), 0);
  const totalOrders = filteredItems.reduce((s, i) => s + (Number(i.orders_count) || 0), 0);

  // Category breakdown
  const regularPostsCount = filteredItems.filter((i) => i.content_type === "Bài viết" || i.content_type === "Video dài").length;
  const shortVideosCount = filteredItems.filter((i) => i.content_type === "Reels" || i.content_type === "Shorts" || i.content_type === "Video ngắn").length;

  const formatNumber = (num: number) => new Intl.NumberFormat("vi-VN").format(num);

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
          <p className="text-xs text-slate-500">Quản lý hiệu quả kênh và danh sách nội dung xuất bản</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/70">
            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                activeTab === "summary" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tab A: Tổng hợp hiệu quả
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contents")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                activeTab === "contents" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tab B: Danh sách nội dung ({filteredItems.length})
            </button>
          </div>

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

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {platform === "facebook" && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Fanpage:</span>
              <select
                value={selectedFanpage}
                onChange={(e) => setSelectedFanpage(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="all">Tất cả Fanpage</option>
                {HATICO_FANPAGES.map((fp) => (
                  <option key={fp} value={fp}>{fp}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Chi nhánh:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="all">Tất cả chi nhánh</option>
              {HATICO_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Từ ngày:</span>
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
      </div>

      {/* ================= TAB A: TỔNG HỢP HIỆU QUẢ ================= */}
      {activeTab === "summary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {platform === "website" ? "Tổng bài viết" : "Tổng nội dung đã đăng"}
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">{formatNumber(totalPosts)}</p>
              {platform === "facebook" && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {regularPostsCount} bài viết · {shortVideosCount} Reels/Video
                </p>
              )}
              {platform === "youtube" && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {regularPostsCount} video dài · {shortVideosCount} Shorts
                </p>
              )}
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {platform === "website" ? "Tổng lượt xem trang" : "Tổng lượt xem"}
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">{formatNumber(totalViews)}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {platform === "website" ? "Khách đăng ký/Liên hệ" : "Tổng tương tác"}
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {formatNumber(platform === "website" ? totalLeads : totalInteractions)}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Khách quan tâm</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{formatNumber(totalLeads)}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Khách được tư vấn</span>
              <p className="text-2xl font-black text-sky-700 mt-1">{formatNumber(totalConsulted)}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Khách chuyển đổi</span>
              <p className="text-2xl font-black text-teal-700 mt-1">{formatNumber(totalConverted)}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đơn hàng chốt</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{formatNumber(totalOrders)}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tỷ lệ chốt / quan tâm</span>
              <p className="text-xl font-black text-primary mt-1">
                {totalLeads > 0 ? `${((totalOrders / totalLeads) * 100).toFixed(1)}%` : "0%"}
              </p>
            </div>
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
                        {formatNumber(item.views)}
                      </td>
                      {platform !== "website" && (
                        <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                          {formatNumber(item.interactions)}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-center font-bold text-amber-600">
                        {item.leads_count || 0}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                        {item.orders_count || 0}
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
                  <select
                    value={formContentType}
                    onChange={(e) => setFormContentType(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    {platform === "facebook" && (
                      <>
                        <option value="Bài viết">Bài viết</option>
                        <option value="Reels">Reels</option>
                        <option value="Video">Video</option>
                      </>
                    )}
                    {platform === "tiktok" && (
                      <>
                        <option value="Video ngắn">Video ngắn</option>
                      </>
                    )}
                    {platform === "youtube" && (
                      <>
                        <option value="Shorts">Shorts</option>
                        <option value="Video dài">Video dài</option>
                      </>
                    )}
                    {platform === "website" && (
                      <>
                        <option value="Bài website">Bài website</option>
                      </>
                    )}
                  </select>
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
                  <select
                    value={formFanpage}
                    onChange={(e) => setFormFanpage(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    {HATICO_FANPAGES.map((fp) => (
                      <option key={fp} value={fp}>{fp}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Chi nhánh liên quan</label>
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

              {/* Phần số liệu thực tế */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase">
                  Số liệu thực tế đạt được
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
                  <div>
                    <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Khách quan tâm</label>
                    <input
                      type="number"
                      min="0"
                      value={formLeads}
                      onChange={(e) => setFormLeads(e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Đã tư vấn</label>
                    <input
                      type="number"
                      min="0"
                      value={formConsulted}
                      onChange={(e) => setFormConsulted(e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Chuyển đổi</label>
                    <input
                      type="number"
                      min="0"
                      value={formConverted}
                      onChange={(e) => setFormConverted(e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Đơn hàng chốt</label>
                    <input
                      type="number"
                      min="0"
                      value={formOrders}
                      onChange={(e) => setFormOrders(e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                </div>
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
    </div>
  );
}

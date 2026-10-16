import React, { useState, useMemo } from "react";
import { ChannelResultRow, TopContentItem } from "@/lib/periodic-marketing-types";
import { HATICO_BRANCHES, isPostInBranch, getBranchPIC } from "@/lib/marketing-types";

interface PeriodicChannelTableProps {
  channels: ChannelResultRow[];
  totals: {
    contentCount: number;
    views: number;
    interactions: number;
    leads: number;
    consulted: number;
    converted: number;
    orders: number;
  };
  topContents: TopContentItem[];
  isEditing?: boolean;
  onUpdateChannel?: (
    platform: "facebook" | "tiktok" | "youtube" | "website",
    field: keyof ChannelResultRow,
    value: number
  ) => void;
  showOnlyTable?: boolean;
  showOnlyPosts?: boolean;
  onAddContentItem?: (item: TopContentItem) => void;
  onUpdateContentItem?: (id: string, field: keyof TopContentItem, value: any) => void;
  onDeleteContentItem?: (id: string) => void;
}

export function PeriodicChannelTable({
  channels,
  totals,
  topContents,
  isEditing = false,
  showOnlyTable = false,
  showOnlyPosts = false,
  onUpdateChannel,
  onAddContentItem,
  onUpdateContentItem,
  onDeleteContentItem,
}: PeriodicChannelTableProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fb = channels.find((c) => c.platform === "facebook");
  const tt = channels.find((c) => c.platform === "tiktok");
  const yt = channels.find((c) => c.platform === "youtube");
  const ws = channels.find((c) => c.platform === "website");

  const formatVal = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return "—";
    return val.toLocaleString("vi-VN");
  };

  const renderCellInput = (
    platform: "facebook" | "tiktok" | "youtube" | "website",
    field: keyof ChannelResultRow,
    rawVal: number | null | undefined,
    allowNull = false
  ) => {
    if (!isEditing) {
      return formatVal(rawVal);
    }
    if (allowNull && rawVal === null) {
      return <span className="text-slate-400">—</span>;
    }
    return (
      <input
        type="number"
        min="0"
        value={rawVal ?? 0}
        onChange={(e) =>
          onUpdateChannel?.(
            platform,
            field,
            Math.max(0, parseInt(e.target.value) || 0)
          )
        }
        className="w-20 text-right text-xs py-1 px-1.5 border border-slate-300 rounded-[3px] bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
      />
    );
  };

  const filteredContents = useMemo(() => {
    return topContents.filter((c) => {
      if (selectedPlatform !== "all" && c.platformKey !== selectedPlatform) {
        return false;
      }
      if (selectedBranchId !== "all" && !isPostInBranch(c, selectedBranchId)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchAuthor = c.authorName?.toLowerCase().includes(q);
        const matchBranch = c.branchName?.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor && !matchBranch) return false;
      }
      return true;
    });
  }, [topContents, selectedPlatform, selectedBranchId, searchQuery]);

  // Gom nhóm theo chi nhánh để hiển thị mạch lạc, không phân tán ngẫu nhiên
  const groupedBranches = useMemo(() => {
    const groups: {
      branchId: string;
      branchName: string;
      posts: TopContentItem[];
      totalViews: number;
      totalInteractions: number;
      totalLeads: number;
      totalOrders: number;
    }[] = HATICO_BRANCHES.map((b) => {
      const bPosts = filteredContents.filter((c) => isPostInBranch(c, b.id));
      const totalViews = bPosts.reduce((sum, p) => sum + (p.views || 0), 0);
      const totalInteractions = bPosts.reduce((sum, p) => sum + (p.interactions || 0), 0);
      const totalLeads = bPosts.reduce((sum, p) => sum + (p.leads || 0), 0);
      const totalOrders = bPosts.reduce((sum, p) => sum + (p.orders || 0), 0);

      return {
        branchId: b.id,
        branchName: b.name,
        posts: bPosts,
        totalViews,
        totalInteractions,
        totalLeads,
        totalOrders,
      };
    }).filter((g) => g.posts.length > 0);

    const matchedIds = new Set(groups.flatMap((g) => g.posts.map((p) => p.id)));
    const otherPosts = filteredContents.filter((p) => !matchedIds.has(p.id));
    if (otherPosts.length > 0) {
      groups.push({
        branchId: "other",
        branchName: "Chi nhánh khác",
        posts: otherPosts,
        totalViews: otherPosts.reduce((sum, p) => sum + (p.views || 0), 0),
        totalInteractions: otherPosts.reduce((sum, p) => sum + (p.interactions || 0), 0),
        totalLeads: otherPosts.reduce((sum, p) => sum + (p.leads || 0), 0),
        totalOrders: otherPosts.reduce((sum, p) => sum + (p.orders || 0), 0),
      });
    }

    return groups;
  }, [filteredContents]);

  const fbCount = topContents.filter((c) => c.platformKey === "facebook").length;
  const ttCount = topContents.filter((c) => c.platformKey === "tiktok").length;
  const ytCount = topContents.filter((c) => c.platformKey === "youtube").length;
  const wsCount = topContents.filter((c) => c.platformKey === "website").length;

  const handleAddNewPost = () => {
    if (!onAddContentItem) return;
    const newPost: TopContentItem = {
      id: crypto.randomUUID(),
      title: "",
      platform: "Chưa chọn",
      platformKey: "" as any,
      publishDate: new Date().toISOString().slice(0, 10),
      views: 0,
      interactions: 0,
      contentType: "Bài viết",
      leads: 0,
    };
    onAddContentItem(newPost);
  };

  return (
    <div className="space-y-4">
      {/* 1. Main Channel Comparison Table */}
      {!showOnlyPosts && (
        <div className="overflow-x-auto border border-slate-200/90 rounded-[4px] bg-white shadow-2xs print:border-slate-300 print:shadow-none">
        {isEditing && (
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-[11px] text-slate-700 font-medium flex items-center justify-between">
            <span>
              Chế độ chỉnh sửa: Bạn có thể nhập trực tiếp số liệu cho từng kênh, cột <strong>Tổng</strong> và các thẻ <strong>KPI</strong> sẽ tự động tính toán lại.
            </span>
          </div>
        )}
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-800 font-bold">
              <th className="py-2.5 px-3 w-1/4">Chỉ số</th>
              <th className="py-2.5 px-3 text-right">Facebook</th>
              <th className="py-2.5 px-3 text-right">TikTok</th>
              <th className="py-2.5 px-3 text-right">YouTube</th>
              <th className="py-2.5 px-3 text-right">Website</th>
              <th className="py-2.5 px-3 text-right bg-slate-200/70 font-extrabold text-slate-900">
                Tổng
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-sans font-medium text-slate-900">Số bài viết/video</td>
              <td className="py-2 px-3 text-right">{renderCellInput("facebook", "contentCount", fb?.contentCount)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("tiktok", "contentCount", tt?.contentCount)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("youtube", "contentCount", yt?.contentCount)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("website", "contentCount", ws?.contentCount)}</td>
              <td className="py-2 px-3 text-right font-bold bg-slate-50 text-slate-900">
                {formatVal(totals.contentCount)}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-sans font-medium text-slate-900">Lượt xem</td>
              <td className="py-2 px-3 text-right">{renderCellInput("facebook", "views", fb?.views)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("tiktok", "views", tt?.views)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("youtube", "views", yt?.views)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("website", "views", ws?.views)}</td>
              <td className="py-2 px-3 text-right font-bold bg-slate-50 text-slate-900">
                {formatVal(totals.views)}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-sans font-medium text-slate-900">Lượt tương tác</td>
              <td className="py-2 px-3 text-right">{renderCellInput("facebook", "interactions", fb?.interactions)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("tiktok", "interactions", tt?.interactions)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("youtube", "interactions", yt?.interactions)}</td>
              <td className="py-2 px-3 text-right text-slate-400">—</td>
              <td className="py-2 px-3 text-right font-bold bg-slate-50 text-slate-900">
                {formatVal(totals.interactions)}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-sans font-medium text-slate-900">Khách hàng quan tâm</td>
              <td className="py-2 px-3 text-right font-semibold text-slate-900">{renderCellInput("facebook", "leads", fb?.leads)}</td>
              <td className="py-2 px-3 text-right font-semibold text-slate-900">{renderCellInput("tiktok", "leads", tt?.leads)}</td>
              <td className="py-2 px-3 text-right font-semibold text-slate-900">{renderCellInput("youtube", "leads", yt?.leads)}</td>
              <td className="py-2 px-3 text-right font-semibold text-slate-900">{renderCellInput("website", "leads", ws?.leads)}</td>
              <td className="py-2 px-3 text-right font-bold bg-slate-50 text-slate-900">
                {formatVal(totals.leads)}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-sans font-medium text-slate-900">Khách được tư vấn</td>
              <td className="py-2 px-3 text-right">{renderCellInput("facebook", "consulted", fb?.consulted)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("tiktok", "consulted", tt?.consulted)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("youtube", "consulted", yt?.consulted)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("website", "consulted", ws?.consulted)}</td>
              <td className="py-2 px-3 text-right font-bold bg-slate-50 text-slate-900">
                {formatVal(totals.consulted)}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-sans font-medium text-slate-900">Khách chuyển đổi</td>
              <td className="py-2 px-3 text-right">{renderCellInput("facebook", "converted", fb?.converted)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("tiktok", "converted", tt?.converted)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("youtube", "converted", yt?.converted)}</td>
              <td className="py-2 px-3 text-right">{renderCellInput("website", "converted", ws?.converted)}</td>
              <td className="py-2 px-3 text-right font-bold bg-slate-50 text-slate-900">
                {formatVal(totals.converted)}
              </td>
            </tr>

            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 font-sans font-medium text-slate-900">Đơn chốt</td>
              <td className="py-2 px-3 text-right font-bold text-slate-900">{renderCellInput("facebook", "orders", fb?.orders)}</td>
              <td className="py-2 px-3 text-right font-bold text-slate-900">{renderCellInput("tiktok", "orders", tt?.orders)}</td>
              <td className="py-2 px-3 text-right font-bold text-slate-900">{renderCellInput("youtube", "orders", yt?.orders)}</td>
              <td className="py-2 px-3 text-right font-bold text-slate-900">{renderCellInput("website", "orders", ws?.orders)}</td>
              <td className="py-2 px-3 text-right font-extrabold bg-slate-50 text-slate-900">
                {formatVal(totals.orders)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      )}

      {/* 2. Full Content List for the Period */}
      {!showOnlyTable && (
        <div className="border border-slate-200/90 rounded-[4px] bg-white p-3.5 shadow-2xs print:border-slate-300 print:shadow-none space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Danh sách chi tiết bài viết & video đã đăng trong kỳ ({topContents.length})
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Toàn bộ nội dung truyền thông đã đăng tải được ghi nhận và đối soát trong kỳ
            </p>
          </div>

          <div className="flex items-center gap-2 no-print">
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, nhân sự, chi nhánh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs px-2.5 py-1 border border-slate-200 rounded-[4px] w-52 sm:w-60 focus:outline-none focus:border-slate-900"
            />
            {isEditing && (
              <button
                type="button"
                onClick={handleAddNewPost}
                className="px-2.5 py-1 text-xs font-bold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>+</span>
                <span>Thêm bài</span>
              </button>
            )}
          </div>
        </div>

        {/* Channel & Branch Filter Chips */}
        <div className="space-y-1.5 no-print">
          {/* 1. Nền tảng */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-0.5">
              Nền tảng:
            </span>
            {[
              { id: "all", label: `Tất cả (${topContents.length})` },
              { id: "facebook", label: `Facebook (${fbCount})` },
              { id: "tiktok", label: `TikTok (${ttCount})` },
              { id: "youtube", label: `YouTube (${ytCount})` },
              { id: "website", label: `Website (${wsCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedPlatform(tab.id)}
                className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedPlatform === tab.id
                    ? "bg-slate-900 text-white font-bold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 2. Chi nhánh */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-0.5">
              Chi nhánh:
            </span>
            <button
              type="button"
              onClick={() => setSelectedBranchId("all")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedBranchId === "all"
                  ? "bg-slate-800 text-white font-bold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              Tất cả chi nhánh
            </button>
            {HATICO_BRANCHES.map((b) => {
              const bCount = topContents.filter((c) => isPostInBranch(c, b.id)).length;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBranchId(b.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    selectedBranchId === b.id
                      ? "bg-slate-800 text-white font-bold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  {b.name} ({bCount})
                </button>
              );
            })}
          </div>
        </div>

        {filteredContents.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-[4px]">
            {topContents.length === 0
              ? "Chưa có bài viết/video nào được ghi nhận trong kỳ báo cáo này."
              : "Không tìm thấy nội dung nào phù hợp với bộ lọc."}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[550px] overflow-y-auto border border-slate-200/80 rounded">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr className="border-b border-slate-200 text-slate-800 font-bold">
                  <th className="py-2 px-2.5 w-10 text-center font-mono">#</th>
                  <th className="py-2 px-2.5">Tên bài viết / video</th>
                  <th className="py-2 px-2.5">Kênh</th>
                  <th className="py-2 px-2.5">Định dạng</th>
                  <th className="py-2 px-2.5">Ngày đăng</th>
                  <th className="py-2 px-2.5 text-right">Lượt xem</th>
                  <th className="py-2 px-2.5 text-right">Tương tác</th>
                  <th className="py-2 px-2.5 text-right">Khách QT</th>
                  <th className="py-2 px-2.5 text-center no-print">Liên kết</th>
                  {isEditing && <th className="py-2 px-2 text-center no-print w-10">Xóa</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {groupedBranches.map((grp) => (
                  <React.Fragment key={grp.branchId}>
                    {/* Header gom nhóm từng chi nhánh */}
                    <tr className="bg-slate-100/90 text-slate-900 font-bold border-y border-slate-200/90 sticky top-[33px] z-[5]">
                      <td colSpan={isEditing ? 10 : 9} className="py-2 px-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs text-slate-900 font-bold uppercase tracking-wider">
                            <span>CHI NHÁNH: {grp.branchName}</span>
                            <span className="text-[11px] font-mono text-slate-500 font-normal">
                              ({grp.posts.length} bài viết)
                            </span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-600 font-medium hidden sm:inline">
                            Tổng: {grp.totalViews.toLocaleString("vi-VN")} views · {grp.totalInteractions.toLocaleString("vi-VN")} tương tác · {grp.totalLeads} leads · {grp.totalOrders} đơn chốt
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Danh sách bài viết của chi nhánh */}
                    {grp.posts.map((c, pIdx) => (
                      <tr key={c.id || pIdx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-2.5 text-center text-slate-400 font-medium">
                          {pIdx + 1}
                        </td>
                        <td className="py-2 px-2.5 font-sans font-medium text-slate-900 max-w-sm">
                          {isEditing ? (
                            <input
                              type="text"
                              value={c.title}
                              onChange={(e) =>
                                onUpdateContentItem?.(c.id, "title", e.target.value)
                              }
                              className="w-full text-xs p-1 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold"
                            />
                          ) : (
                            <>
                              <div className="truncate font-semibold" title={c.title}>
                                {c.title}
                              </div>
                              <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                                {c.branchName ? `${c.branchName} · ` : ""}
                                <span>Phụ trách: {getBranchPIC(c.branchId, c.branchName || grp.branchName)}</span>
                              </div>
                            </>
                          )}
                        </td>
                        <td className="py-2 px-2.5 font-sans">
                          {isEditing ? (
                            <select
                              value={c.platformKey || ""}
                              onChange={(e) => {
                                const pk = e.target.value as "facebook" | "tiktok" | "youtube" | "website";
                                const pName =
                                  pk === "facebook" ? "Facebook" : pk === "tiktok" ? "TikTok" : pk === "youtube" ? "YouTube" : pk === "website" ? "Website" : "Chưa chọn";
                                onUpdateContentItem?.(c.id, "platformKey", pk);
                                onUpdateContentItem?.(c.id, "platform", pName);
                              }}
                              className="text-[11px] p-1 border border-slate-300 rounded bg-white font-medium"
                            >
                              <option value="">-- Chưa chọn --</option>
                              <option value="facebook">Facebook</option>
                              <option value="tiktok">TikTok</option>
                              <option value="youtube">YouTube</option>
                              <option value="website">Website</option>
                            </select>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-[3px] text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                              {c.platform}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 font-sans text-slate-600 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="text"
                              value={c.contentType || ""}
                              onChange={(e) =>
                                onUpdateContentItem?.(c.id, "contentType", e.target.value)
                              }
                              placeholder="Bài viết/Reels"
                              className="w-20 text-xs p-1 border border-slate-300 rounded bg-white"
                            />
                          ) : (
                            c.contentType || "—"
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-slate-500 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="date"
                              value={c.publishDate}
                              onChange={(e) =>
                                onUpdateContentItem?.(c.id, "publishDate", e.target.value)
                              }
                              className="text-xs p-1 border border-slate-300 rounded bg-white"
                            />
                          ) : (
                            c.publishDate
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={c.views}
                              onChange={(e) =>
                                onUpdateContentItem?.(c.id, "views", Math.max(0, parseInt(e.target.value) || 0))
                              }
                              className="w-18 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono font-bold"
                            />
                          ) : (
                            c.views.toLocaleString("vi-VN")
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-700">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={c.interactions}
                              onChange={(e) =>
                                onUpdateContentItem?.(c.id, "interactions", Math.max(0, parseInt(e.target.value) || 0))
                              }
                              className="w-16 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono"
                            />
                          ) : (
                            c.interactions.toLocaleString("vi-VN")
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-right font-semibold text-slate-900">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={c.leads ?? 0}
                              onChange={(e) =>
                                onUpdateContentItem?.(c.id, "leads", Math.max(0, parseInt(e.target.value) || 0))
                              }
                              className="w-14 text-right text-xs p-1 border border-slate-300 rounded bg-white font-mono"
                            />
                          ) : (
                            c.leads !== undefined && c.leads > 0 ? c.leads.toLocaleString("vi-VN") : "0"
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-center font-sans no-print">
                          {c.link ? (
                            <a
                              href={c.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 hover:underline font-medium text-[11px]"
                            >
                              <span>Xem</span>
                              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        {isEditing && (
                          <td className="py-2 px-2 text-center no-print">
                            <button
                              type="button"
                              onClick={() => onDeleteContentItem?.(c.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Xóa bài viết"
                            >
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}

                    {/* Dòng tổng phụ cho từng chi nhánh */}
                    <tr className="bg-slate-50 font-semibold text-slate-700 text-[11px] border-b border-slate-200">
                      <td colSpan={2} className="py-1.5 px-3 text-right font-sans text-slate-500 italic">
                        Tổng cộng {grp.branchName}:
                      </td>
                      <td colSpan={3} className="py-1.5 px-2.5 text-slate-400 font-normal">
                        {grp.posts.length} bài viết
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-slate-900">
                        {grp.totalViews.toLocaleString("vi-VN")}
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-slate-700">
                        {grp.totalInteractions.toLocaleString("vi-VN")}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-slate-900">
                        {grp.totalLeads.toLocaleString("vi-VN")}
                      </td>
                      <td colSpan={isEditing ? 2 : 1} className="py-1.5 px-2.5 text-center text-slate-400">
                        —
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

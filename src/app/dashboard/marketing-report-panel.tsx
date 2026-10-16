"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  getMarketingReports,
  saveMarketingReportsBatch,
  type MarketingPostRow,
  type MarketingEventRow,
  type Profile,
} from "../actions";
import type {
  MarketingPostEntry,
  MarketingEventEntry,
  CallReportPeriod,
} from "@/lib/report-data";
import AdminSelect from "./admin-select";
import { HATICO_BRANCHES } from "@/lib/marketing-types";
import { downloadMarketingReportExcel } from "@/lib/marketing-report-export";
import { MarketingExcelPreviewModal } from "./marketing-excel-preview-modal";
import DatePickerModal, { formatDateButtonLabel } from "./date-picker-modal";

const TikTokIcon = (
  <svg
    className="w-4 h-4 fill-current shrink-0"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.23-.45-.48-.64-.73v7.28c-.08 3.26-2.01 6.34-5.11 7.4-3.1 1.13-6.85.34-9.06-2-2.31-2.39-2.73-6.27-1.02-9.14 1.7-2.92 5.29-4.48 8.59-3.79v4.2c-1.84-.46-3.87.21-4.79 1.83-.97 1.67-.54 3.98 1.02 5.16 1.54 1.19 3.93.98 5.2-.44.59-.65.75-1.51.74-2.36.01-4.07.01-8.14.01-12.21-.01-.32-.03-.64-.03-.96z" />
  </svg>
);

const FacebookIcon = (
  <svg
    className="w-4 h-4 fill-current shrink-0"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const YouTubeIcon = (
  <svg
    className="w-4 h-4 fill-current shrink-0"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.004 3.004 0 0 0-2.11 2.108C0 8.028 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.475 20.455 12 20.455 12 20.455s7.524 0 9.388-.51a3.003 3.003 0 0 0 2.11-2.108C24 15.972 24 12 24 12s0-3.972-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const WebsiteIcon = (
  <svg
    className="w-4 h-4 fill-current shrink-0"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.53c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.4z" />
  </svg>
);

const VIEW_OPTIONS = [
  { value: ">1k", label: ">1k" },
  { value: ">2k", label: ">2k" },
  { value: ">5k view", label: ">5k view" },
  { value: "> 10k view", label: "> 10k view" },
];

type EditablePostRow = MarketingPostRow & { rowId: string };
type EditableEventRow = MarketingEventRow & { rowId: string };

type MarketingReportPanelProps = {
  profile: Profile;
};

function toEditablePostRows(posts: MarketingPostRow[]): EditablePostRow[] {
  return posts.map((post, i) => ({
    ...post,
    id: post.id,
    branch_id: post.branch_id || HATICO_BRANCHES[0].id,
    rowId: post.id || `${post.report_id}-${post.report_date}-${i}`,
  }));
}

function toEditableEventRows(events: MarketingEventRow[]): EditableEventRow[] {
  return events.map((event, i) => ({
    ...event,
    rowId: `${event.report_id}-${event.report_date}-${i}`,
  }));
}

function togglePlatform(currentPlatforms: string, platformToToggle: string) {
  const list = currentPlatforms.split(", ").filter(Boolean);
  if (list.includes(platformToToggle)) {
    const remaining = list.filter((p) => p !== platformToToggle);
    return remaining.join(", ");
  } else {
    return [...list, platformToToggle].join(", ");
  }
}

function newEmptyPostRow(todayStr: string, branchId?: string): EditablePostRow {
  const newId = crypto.randomUUID();
  return {
    type: "marketing_post",
    id: newId,
    rowId: `new-post-${newId}`,
    report_id: "",
    report_date: todayStr,
    platform: "",
    title: "",
    link: "",
    views: "",
    likes: "",
    comments: "",
    shares: "",
    status: "completed",
    branch_id: branchId || HATICO_BRANCHES[0].id,
  };
}

export function MarketingReportPanel({ profile }: MarketingReportPanelProps) {
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString("sv-SE", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  }, []);
  const isAdmin = profile.role === "admin";

  const [period] = useState<CallReportPeriod>("all");
  const [selectedStaffId, setSelectedStaffId] = useState<string>(profile.id);

  const [posts, setPosts] = useState<EditablePostRow[]>([]);
  const [events, setEvents] = useState<EditableEventRow[]>([]);

  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  });
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterBranch, setFilterBranch] = useState<string>(HATICO_BRANCHES[0].id);

  const [editingRowIds, setEditingRowIds] = useState<Set<string>>(new Set());

  const branchOptions = useMemo(() => {
    return [
      { value: "all", label: "Tất cả chi nhánh" },
      ...HATICO_BRANCHES.map((b) => ({
        value: b.id,
        label: b.name,
      })),
    ];
  }, []);

  const monthOptions = useMemo(() => {
    const options = [{ value: "all", label: "Tất cả các tháng" }];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      options.push({
        value: `${yyyy}-${mm}`,
        label: `Tháng ${mm}/${yyyy}`,
      });
    }
    return options;
  }, []);

  const daysInMonth = useMemo(() => {
    if (filterMonth === "all") return [];
    const [yyyy, mm] = filterMonth.split("-").map(Number);
    const lastDay = new Date(yyyy, mm, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => {
      const d = i + 1;
      const date = new Date(yyyy, mm - 1, d);
      const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      return {
        dayStr: String(d).padStart(2, "0"),
        label: `${d}`,
        dayName: dayNames[date.getDay()],
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      };
    });
  }, [filterMonth]);

  const displayedPosts = useMemo(() => {
    return posts.filter((post) => {
      if (filterMonth !== "all") {
        if (!post.report_date.startsWith(filterMonth)) return false;
      }
      if (filterPlatform !== "all") {
        if (!post.platform.includes(filterPlatform) && !editingRowIds.has(post.rowId)) return false;
      }
      if (filterBranch !== "all") {
        const postBranch = post.branch_id || HATICO_BRANCHES[0].id;
        if (postBranch !== filterBranch) return false;
      }
      return true;
    });
  }, [posts, filterMonth, filterPlatform, filterBranch, editingRowIds]);

  const [marketingStaff, setMarketingStaff] = useState<
    { id: string; full_name: string }[]
  >([]);

  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState("");
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  const [activeDatePicker, setActiveDatePicker] = useState<{
    rowId: string;
    value: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [showExcelPreview, setShowExcelPreview] = useState(false);

  const postTitleRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const blurTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const dirtyDatesRef = useRef<Set<string>>(new Set());

  const latestPosts = useRef(posts);
  const latestEvents = useRef(events);
  const activeDatePickerRef = useRef<typeof activeDatePicker>(activeDatePicker);

  useEffect(() => {
    latestPosts.current = posts;
    latestEvents.current = events;
  }, [posts, events]);

  useEffect(() => {
    activeDatePickerRef.current = activeDatePicker;
  }, [activeDatePicker]);

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const applyFetched = (
    fetchedPosts: MarketingPostRow[],
    fetchedEvents: MarketingEventRow[],
    staffList?: { id: string; full_name: string }[],
  ) => {
    setPosts((prev) => {
      const savedPosts = toEditablePostRows(fetchedPosts);
      const unsaved = prev.filter((p) => {
        if (!p.rowId.startsWith("new-")) return false;
        if (!p.title.trim()) return false;
        const isSaved = savedPosts.some(
          (sp) =>
            sp.title === p.title &&
            sp.platform === p.platform &&
            sp.link === p.link &&
            sp.report_date === p.report_date,
        );
        return !isSaved;
      });
      return [...savedPosts, ...unsaved];
    });

    setEvents(toEditableEventRows(fetchedEvents));

    if (staffList) {
      setMarketingStaff(staffList);
    }
    setSelectedPosts(new Set());
    setErrorMsg("");
    setIsInitialLoaded(true);
  };

  const loadReports = (p: CallReportPeriod, sId: string) => {
    startTransition(async () => {
      const result = await getMarketingReports(p, sId);
      if (!("error" in result)) {
        dirtyDatesRef.current = new Set();
        applyFetched(result.posts, result.events, result.marketingStaff);
      } else {
        setErrorMsg(result.error || "Không thể tải báo cáo");
        setIsInitialLoaded(true);
      }
    });
  };

  useEffect(() => {
    loadReports(period, selectedStaffId);
  }, []);

  const handleStaffChange = (value: string) => {
    setSelectedStaffId(value);
    loadReports(period, value);
  };

  const postMetrics = useMemo(() => {
    let tiktok = 0;
    let facebook = 0;
    let youtube = 0;
    let website = 0;
    let views = 0;
    let tiktokViews = 0;
    let tiktokOver5k = 0;
    let tiktokOver10k = 0;

    displayedPosts.forEach((p) => {
      if (!p.title.trim()) return;

      const rawViews = String(p.views || "").toLowerCase();
      const v =
        rawViews.includes(">10k") || rawViews.includes("> 10k")
          ? 10000
          : rawViews.includes(">5k") || rawViews.includes("> 5k")
            ? 5000
            : rawViews.includes(">2k") || rawViews.includes("> 2k")
              ? 2000
              : rawViews.includes(">1k") || rawViews.includes("> 1k")
                ? 1000
                : parseInt(rawViews.replace(/[^0-9]/g, "")) || 0;

      views += v;

      if (p.platform.includes("Tiktok")) {
        tiktok++;
        tiktokViews += v;
        if (v >= 10000) tiktokOver10k++;
        if (v >= 5000) tiktokOver5k++;
      }
      if (p.platform.includes("Facebook")) facebook++;
      if (p.platform.includes("Youtube")) youtube++;
      if (p.platform.includes("Website")) website++;
    });

    const total =
      filterPlatform === "all"
        ? tiktok + facebook + youtube + website
        : filterPlatform === "Tiktok"
          ? tiktok
          : filterPlatform === "Facebook"
            ? facebook
            : filterPlatform === "Youtube"
              ? youtube
              : website;

    return {
      total,
      tiktok,
      facebook,
      youtube,
      website,
      views,
      tiktokViews,
      tiktokOver5k,
      tiktokOver10k,
    };
  }, [displayedPosts, filterPlatform]);

  const totalAllPostsCount = useMemo(() => {
    return posts.reduce((acc, p) => {
      if (!p.title.trim()) return acc;
      if (filterBranch !== "all") {
        const postBranch = p.branch_id || HATICO_BRANCHES[0].id;
        if (postBranch !== filterBranch) return acc;
      }
      let count = 0;
      if (p.platform.includes("Tiktok")) count++;
      if (p.platform.includes("Facebook")) count++;
      if (p.platform.includes("Youtube")) count++;
      if (p.platform.includes("Website")) count++;
      return acc + (count || 1);
    }, 0);
  }, [posts, filterBranch]);

  const updatePostRow = (
    rowId: string,
    field: keyof Omit<EditablePostRow, "type" | "rowId">,
    value: string,
    shouldSave = false,
  ) => {
    setPosts((prev) => {
      const rowToEdit = prev.find((r) => r.rowId === rowId);
      if (rowToEdit) {
        dirtyDatesRef.current.add(rowToEdit.report_date);
        if (field === "report_date") dirtyDatesRef.current.add(value);
      }

      const next = prev.map((r) =>
        r.rowId === rowId ? { ...r, [field]: value } : r,
      );
      if (shouldSave) {
        const editedRow = next.find((r) => r.rowId === rowId);
        if (editedRow && editedRow.title.trim()) {
          setTimeout(() => {
            startSave(async () => {
              await persistReports(next, latestEvents.current, [], true);
            });
          }, 0);
        }
      }
      return next;
    });
  };

  const handleAddPostRow = (dateStr?: string) => {
    const rowDate = dateStr || todayStr;
    const targetBranch =
      filterBranch !== "all" ? filterBranch : HATICO_BRANCHES[0].id;
    const row = newEmptyPostRow(rowDate, targetBranch);
    dirtyDatesRef.current.add(rowDate);
    setPosts((prev) => [row, ...prev]);
    setEditingRowIds((prev) => new Set(prev).add(row.rowId));
    setTimeout(() => {
      postTitleRefs.current.get(row.rowId)?.focus();
    }, 40);
  };

  const toggleSelectPost = (rowId: string) => {
    setSelectedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleSelectAllPosts = () => {
    if (selectedPosts.size === displayedPosts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(displayedPosts.map((r) => r.rowId)));
    }
  };

  const startEditRow = (rowId: string) => {
    setEditingRowIds((prev) => new Set(prev).add(rowId));
    requestAnimationFrame(() => {
      postTitleRefs.current.get(rowId)?.focus();
    });
  };

  const finishEditRow = (rowId: string) => {
    const existingTimer = blurTimeoutRefs.current.get(rowId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      blurTimeoutRefs.current.delete(rowId);
    }

    setEditingRowIds((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });

    setPosts((prev) => {
      const target = prev.find((r) => r.rowId === rowId);
      if (target && target.rowId.startsWith("new-") && !target.title.trim()) {
        const next = prev.filter((r) => r.rowId !== rowId);
        latestPosts.current = next;
        return next;
      }
      latestPosts.current = prev;
      return prev;
    });

    setTimeout(() => {
      const currentPosts = latestPosts.current;
      const row = currentPosts.find((r) => r.rowId === rowId);
      if (row && row.title.trim()) {
        dirtyDatesRef.current.add(row.report_date);
        startSave(async () => {
          await persistReports(currentPosts, latestEvents.current, [], true);
        });
      }
    }, 40);
  };

  const handleRowBlur = (
    e: React.FocusEvent<HTMLTableRowElement>,
    rowId: string
  ) => {
    const existing = blurTimeoutRefs.current.get(rowId);
    if (existing) clearTimeout(existing);

    // If related focus target is within this row, stay in edit mode
    if (
      e.currentTarget &&
      e.relatedTarget &&
      e.currentTarget.contains(e.relatedTarget as Node)
    ) {
      return;
    }

    const timer = setTimeout(() => {
      if (activeDatePickerRef.current?.rowId === rowId) {
        return;
      }
      const rowEl = rowRefs.current.get(rowId);
      if (
        rowEl &&
        document.activeElement &&
        rowEl.contains(document.activeElement)
      ) {
        return;
      }
      finishEditRow(rowId);
    }, 120);

    blurTimeoutRefs.current.set(rowId, timer);
  };

  const handleMarketingBlur = () => {
    const currentPosts = latestPosts.current;
    if (currentPosts.some((p) => p.title.trim())) {
      startSave(async () => {
        await persistReports(currentPosts, latestEvents.current, [], true);
      });
    }
  };

  const persistReports = async (
    currentPosts: EditablePostRow[],
    currentEvents: EditableEventRow[],
    deletedDates: string[] = [],
    skipRefresh: boolean = false,
  ) => {
    deletedDates.forEach((d) => dirtyDatesRef.current.add(d));
    const datesToSave = new Set(dirtyDatesRef.current);
    if (datesToSave.size === 0) return;

    const byDate = new Map<
      string,
      {
        posts: Omit<MarketingPostEntry, "type">[];
        events: Omit<MarketingEventEntry, "type">[];
      }
    >();

    datesToSave.forEach((d) => {
      byDate.set(d, { posts: [], events: [] });
    });

    dirtyDatesRef.current = new Set();

    currentPosts.forEach((post) => {
      if (!datesToSave.has(post.report_date) || !post.title.trim()) return;
      const grp = byDate.get(post.report_date)!;
      grp.posts.push({
        id: post.id,
        platform: post.platform,
        title: post.title.trim(),
        link: post.link.trim(),
        views: post.views.trim(),
        likes: post.likes.trim(),
        comments: post.comments.trim(),
        shares: post.shares.trim(),
        status: post.status,
        topic: post.topic,
        content_type: post.content_type,
        branch_id: post.branch_id || HATICO_BRANCHES[0].id,
        author_id: post.author_id,
      });
    });

    currentEvents.forEach((event) => {
      if (!datesToSave.has(event.event_date) || !event.event_name.trim())
        return;
      const grp = byDate.get(event.event_date)!;
      grp.events.push({
        event_name: event.event_name.trim(),
        event_date: event.event_date.trim(),
        trailer_type: event.trailer_type?.trim() || "",
        qty: event.qty?.trim() || "",
        location: event.location?.trim() || "",
        budget: event.budget.trim(),
        attendees: event.attendees.trim(),
        outcome: event.outcome.trim(),
        status: event.status,
      });
    });

    const entries = [...datesToSave].map((date) => ({
      date,
      posts: byDate.get(date)!.posts,
      events: byDate.get(date)!.events,
    }));

    const result = await saveMarketingReportsBatch(
      entries,
      isAdmin ? selectedStaffId : undefined,
    );

    if ("error" in result) {
      datesToSave.forEach((d) => dirtyDatesRef.current.add(d));
      setErrorMsg(result.error || "Không thể lưu báo cáo.");
      return;
    }

    if (!skipRefresh) {
      const refresh = await getMarketingReports(period, selectedStaffId);
      if (!("error" in refresh)) applyFetched(refresh.posts, refresh.events);
    }
  };

  const handleExportExcel = () => setShowExcelPreview(true);

  const handleConfirmExportExcel = async () => {
    setShowExcelPreview(false);
    try {
      const label =
        filterMonth === "all"
          ? "Tat_ca_cac_thang"
          : `Thang_${filterMonth.split("-")[1]}_${filterMonth.split("-")[0]}`;
      const staffLabel =
        selectedStaffId === "all"
          ? "Tat_ca_nhan_su"
          : marketingStaff.find((s) => s.id === selectedStaffId)?.full_name ||
            profile.full_name;

      await downloadMarketingReportExcel(
        `Bao_cao_marketing_${staffLabel.replace(/\s+/g, "_")}_${label}.xlsx`,
        {
          period,
          staffName: staffLabel,
          branchName:
            filterBranch !== "all"
              ? HATICO_BRANCHES.find((b) => b.id === filterBranch)?.name
              : profile.department?.branch
                ? `${profile.department.name} - ${profile.department.branch.name}`
                : profile.department?.name,
          posts: displayedPosts.filter((p) => p.title.trim()),
          events: events.filter((e) => e.event_name.trim()),
        },
      );
    } catch (err) {
      console.error(err);
      window.alert("Không xuất được Excel.");
    }
  };

  const handleDeleteSelected = () => {
    const deletedDates = posts
      .filter((r) => selectedPosts.has(r.rowId))
      .map((r) => r.report_date);
    const nextPosts = posts.filter((r) => !selectedPosts.has(r.rowId));

    setEditingRowIds((prev) => {
      const next = new Set(prev);
      selectedPosts.forEach((id) => next.delete(id));
      return next;
    });

    setPosts(nextPosts);
    setSelectedPosts(new Set());
    setErrorMsg("");

    startSave(async () => {
      await persistReports(nextPosts, events, deletedDates);
    });
  };

  const conditionsMet = [
    postMetrics.tiktokViews >= 60000,
    postMetrics.tiktokOver5k >= 5,
    postMetrics.tiktokOver10k >= 1,
  ].filter(Boolean).length;
  const isKpiViewsPassed = conditionsMet >= 2;
  const isLoaded = isInitialLoaded || posts.some((p) => p.title.trim());

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white relative">
      {/* Header Chrome (Compact & Quiet) */}
      <div className="border-b border-slate-200/90 px-4 py-2.5 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-slate-900 leading-tight">
            Báo cáo phòng Marketing
          </h2>
          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
            {profile.full_name} · Phòng Marketing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && marketingStaff.length > 0 && (
            <AdminSelect
              value={selectedStaffId}
              onChange={handleStaffChange}
              className="w-40 sm:w-44"
              options={[
                { value: "all", label: "Tất cả nhân sự" },
                ...marketingStaff.map((s) => ({
                  value: s.id,
                  label: s.full_name,
                })),
              ]}
            />
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isPending}
            className="h-9 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 shadow-2xs cursor-pointer px-3.5 transition-colors disabled:opacity-60"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white flex flex-col">
        {/* Metric Summary Strip (2 Compact Enterprise Metric Groups) */}
        <div className="px-4 py-3 grid grid-cols-1 lg:grid-cols-2 gap-3 shrink-0">
          {/* Group A: Sản lượng nội dung */}
          <div className="bg-slate-50/70 rounded-lg p-2.5 sm:p-3 border border-slate-200/70 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Sản lượng nội dung
                </span>
                <span className="text-[10px] font-medium text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                  KPI Tháng
                </span>
              </div>
              <span className="text-xs font-bold text-slate-900 font-mono">
                {isLoaded ? postMetrics.total : "—"}{" "}
                <span className="text-[10px] text-slate-400 font-normal">
                  / 65 bài
                </span>
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1 text-center divide-x divide-slate-200/60">
              <div className="px-1">
                <p className="text-xs font-bold text-slate-900 font-mono">
                  {isLoaded ? postMetrics.tiktok : "—"}{" "}
                  <span className="text-[9px] text-slate-400 font-normal">
                    / 30
                  </span>
                </p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                  TikTok
                </p>
              </div>
              <div className="px-1">
                <p className="text-xs font-bold text-slate-900 font-mono">
                  {isLoaded ? postMetrics.facebook : "—"}{" "}
                  <span className="text-[9px] text-slate-400 font-normal">
                    / 25
                  </span>
                </p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                  Facebook
                </p>
              </div>
              <div className="px-1">
                <p className="text-xs font-bold text-slate-900 font-mono">
                  {isLoaded ? postMetrics.youtube : "—"}{" "}
                  <span className="text-[9px] text-slate-400 font-normal">
                    / 8
                  </span>
                </p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                  YouTube
                </p>
              </div>
              <div className="px-1">
                <p className="text-xs font-bold text-slate-900 font-mono">
                  {isLoaded ? postMetrics.website : "—"}{" "}
                  <span className="text-[9px] text-slate-400 font-normal">
                    / 2
                  </span>
                </p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                  Website
                </p>
              </div>
              <div className="px-1">
                <p className="text-xs font-bold text-slate-900 font-mono">
                  {!isLoaded
                    ? "—"
                    : postMetrics.views >= 1000
                      ? `${(postMetrics.views / 1000).toFixed(1)}k`
                      : postMetrics.views}{" "}
                  <span className="text-[9px] text-slate-400 font-normal">
                    / 120k
                  </span>
                </p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                  Lượt xem
                </p>
              </div>
            </div>
          </div>

          {/* Group B: Hiệu quả TikTok */}
          <div className="bg-slate-50/70 rounded-lg p-2.5 sm:p-3 border border-slate-200/70 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Hiệu quả view TikTok
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                  !isLoaded
                    ? "bg-slate-100 text-slate-400 border-slate-200/70"
                    : isKpiViewsPassed
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                      : "bg-slate-100 text-slate-600 border-slate-200/70"
                }`}
              >
                {!isLoaded
                  ? "—"
                  : isKpiViewsPassed
                    ? "Đạt KPI"
                    : `Đạt ${conditionsMet}/3 tiêu chí`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-center divide-x divide-slate-200/60">
              <div className="px-1">
                <p className="text-xs font-bold text-slate-900 font-mono">
                  {!isLoaded
                    ? "—"
                    : postMetrics.tiktokViews >= 1000
                      ? `${(postMetrics.tiktokViews / 1000).toFixed(1)}k`
                      : postMetrics.tiktokViews}{" "}
                  <span className="text-[9px] text-slate-400 font-normal">
                    / 60k
                  </span>
                </p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                  Tổng View
                </p>
              </div>
              <div className="px-1">
                <p className="text-xs font-bold text-slate-900 font-mono">
                  {isLoaded ? postMetrics.tiktokOver5k : "—"}{" "}
                  <span className="text-[9px] text-slate-400 font-normal">
                    / 5
                  </span>
                </p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                  Video &gt; 5k
                </p>
              </div>
              <div className="px-1">
                <p className="text-xs font-bold text-slate-900 font-mono">
                  {isLoaded ? postMetrics.tiktokOver10k : "—"}{" "}
                  <span className="text-[9px] text-slate-400 font-normal">
                    / 1
                  </span>
                </p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                  Video &gt; 10k
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters (Month, Branch, Counter & Platform Selectors) */}
        <div className="px-4 pb-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0 border-b border-slate-200/60">
          <div className="flex flex-wrap items-center gap-2">
            <AdminSelect
              value={filterMonth}
              onChange={setFilterMonth}
              options={monthOptions}
              className="w-40 sm:w-44"
            />
            <AdminSelect
              value={filterBranch}
              onChange={setFilterBranch}
              options={branchOptions}
              className="w-48 sm:w-56"
            />
            <span className="h-9 px-3 rounded-md text-xs font-medium text-slate-600 bg-slate-100/90 border border-slate-200/70 flex items-center shadow-2xs">
              {isLoaded ? postMetrics.total : "—"} /{" "}
              {isLoaded ? totalAllPostsCount : "—"} bài
              {isLoaded && postMetrics.total !== displayedPosts.length && (
                <span className="ml-1.5 text-[11px] text-slate-400 font-normal">
                  ({displayedPosts.length} nội dung)
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => handleAddPostRow()}
              className="h-9 px-3 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <svg
                className="w-3.5 h-3.5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Thêm bài</span>
            </button>
          </div>

          {/* Platform Filters */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200/60 self-start shrink-0">
            <button
              type="button"
              onClick={() => setFilterPlatform("all")}
              className={`px-3 py-1 rounded text-xs transition-all cursor-pointer ${
                filterPlatform === "all"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFilterPlatform("Tiktok")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-all cursor-pointer ${
                filterPlatform === "Tiktok"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              {TikTokIcon}
              <span>TikTok</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterPlatform("Facebook")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-all cursor-pointer ${
                filterPlatform === "Facebook"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              {FacebookIcon}
              <span>Facebook</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterPlatform("Youtube")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-all cursor-pointer ${
                filterPlatform === "Youtube"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              {YouTubeIcon}
              <span>YouTube</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterPlatform("Website")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-all cursor-pointer ${
                filterPlatform === "Website"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              {WebsiteIcon}
              <span>Website</span>
            </button>
          </div>
        </div>

        {/* Compact Calendar Day Strip */}
        {filterMonth !== "all" && daysInMonth.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-200/60 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {daysInMonth.map((day) => {
                const dateStr = `${filterMonth}-${day.dayStr}`;
                const hasReport = posts.some((p) => {
                  if (p.report_date !== dateStr || !p.title.trim()) return false;
                  if (filterBranch !== "all") {
                    const postBranch = p.branch_id || HATICO_BRANCHES[0].id;
                    if (postBranch !== filterBranch) return false;
                  }
                  return true;
                });

                return (
                  <button
                    key={day.dayStr}
                    type="button"
                    onClick={() => handleAddPostRow(dateStr)}
                    title={`Ngày ${day.dayStr}/${filterMonth.split("-")[1]} - Bấm để thêm bài`}
                    className={`relative shrink-0 flex flex-col items-center justify-center w-8 h-9 rounded-md border text-center transition-all cursor-pointer ${
                      day.isWeekend
                        ? "bg-slate-50 text-slate-400 border-slate-200/70 hover:bg-slate-100"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-[8px] uppercase font-medium text-slate-400 leading-none">
                      {day.dayName}
                    </span>
                    <span className="text-[11px] font-semibold font-mono leading-none mt-1">
                      {day.label}
                    </span>
                    {hasReport && (
                      <span className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Bar (Delete Selected / Error) */}
        {(selectedPosts.size > 0 || errorMsg) && (
          <div className="px-4 py-2 flex items-center justify-between gap-2 bg-rose-50/70 border-b border-rose-200 shrink-0">
            {selectedPosts.size > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-800 font-medium">
                  Đã chọn <strong>{selectedPosts.size}</strong> bài đăng
                </span>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={isSaving}
                  className="h-7 px-2.5 rounded text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  Xóa bài đã chọn
                </button>
              </div>
            ) : null}

            {errorMsg && (
              <span className="text-xs font-semibold text-rose-700">
                {errorMsg}
              </span>
            )}
          </div>
        )}

        {/* Marketing Table List (Polished Enterprise View) */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="px-3 py-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      posts.length > 0 &&
                      selectedPosts.size === displayedPosts.length
                    }
                    onChange={toggleSelectAllPosts}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                    aria-label="Chọn tất cả"
                  />
                </th>
                <th className="px-3 py-2.5 w-20 text-center">Nền tảng</th>
                <th className="px-3 py-2.5 w-32 text-center">Chi nhánh</th>
                <th className="px-4 py-2.5 min-w-[14rem]">
                  Tiêu đề / Nội dung bài đăng
                </th>
                <th className="px-4 py-2.5 min-w-[12rem]">Đường dẫn (Link)</th>
                <th className="px-3 py-2.5 text-center w-28">Lượt xem</th>
                <th className="px-3 py-2.5 text-center w-28">Ngày</th>
                <th className="px-3 py-2.5 text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedPosts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-slate-400 italic font-medium"
                  >
                    {isInitialLoaded
                      ? "Chưa có bài đăng nào trong khoảng thời gian này"
                      : "—"}
                  </td>
                </tr>
              ) : (
                displayedPosts.map((row) => {
                  const isEditing = editingRowIds.has(row.rowId);
                  const isSelected = selectedPosts.has(row.rowId);

                  return (
                    <tr
                      key={row.rowId}
                      ref={(el) => {
                        if (el) rowRefs.current.set(row.rowId, el);
                        else rowRefs.current.delete(row.rowId);
                      }}
                      onBlur={(e) => handleRowBlur(e, row.rowId)}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? "bg-slate-50/90" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectPost(row.rowId)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                          aria-label={`Chọn ${row.title || "bài đăng"}`}
                        />
                      </td>

                      {/* Nền tảng (Platform) */}
                      <td className="px-3 py-2.5 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1 bg-slate-50 rounded border border-slate-200 p-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                updatePostRow(
                                  row.rowId,
                                  "platform",
                                  togglePlatform(row.platform, "Tiktok"),
                                  true,
                                )
                              }
                              title="Tiktok"
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                row.platform.includes("Tiktok")
                                  ? "bg-[#fe2c55]/10 text-[#fe2c55]"
                                  : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              {TikTokIcon}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updatePostRow(
                                  row.rowId,
                                  "platform",
                                  togglePlatform(row.platform, "Facebook"),
                                  true,
                                )
                              }
                              title="Facebook"
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                row.platform.includes("Facebook")
                                  ? "bg-[#1877f2]/10 text-[#1877f2]"
                                  : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              {FacebookIcon}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updatePostRow(
                                  row.rowId,
                                  "platform",
                                  togglePlatform(row.platform, "Youtube"),
                                  true,
                                )
                              }
                              title="Youtube"
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                row.platform.includes("Youtube")
                                  ? "bg-[#ff0000]/10 text-[#ff0000]"
                                  : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              {YouTubeIcon}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updatePostRow(
                                  row.rowId,
                                  "platform",
                                  togglePlatform(row.platform, "Website"),
                                  true,
                                )
                              }
                              title="Website"
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                row.platform.includes("Website")
                                  ? "bg-slate-700/15 text-slate-800"
                                  : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              {WebsiteIcon}
                            </button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-center gap-1.5"
                            title={row.platform || "Chưa chọn nền tảng"}
                          >
                            {row.platform.includes("Tiktok") && (
                              <span
                                className="text-[#fe2c55] inline-flex items-center justify-center"
                                title="TikTok"
                              >
                                {TikTokIcon}
                              </span>
                            )}
                            {row.platform.includes("Facebook") && (
                              <span
                                className="text-[#1877f2] inline-flex items-center justify-center"
                                title="Facebook"
                              >
                                {FacebookIcon}
                              </span>
                            )}
                            {row.platform.includes("Youtube") && (
                              <span
                                className="text-[#ff0000] inline-flex items-center justify-center"
                                title="YouTube"
                              >
                                {YouTubeIcon}
                              </span>
                            )}
                            {row.platform.includes("Website") && (
                              <span
                                className="text-slate-700 inline-flex items-center justify-center"
                                title="Website"
                              >
                                {WebsiteIcon}
                              </span>
                            )}
                            {!row.platform && (
                              <span className="text-slate-300 select-none font-normal">
                                —
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Chi nhánh (Branch) */}
                      <td className="px-3 py-2.5 text-center">
                        {isEditing ? (
                          <select
                            value={row.branch_id || HATICO_BRANCHES[0].id}
                            onChange={(e) =>
                              updatePostRow(
                                row.rowId,
                                "branch_id",
                                e.target.value,
                                true,
                              )
                            }
                            className="w-full text-[11px] h-8 px-1.5 border border-slate-300 rounded bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary/30 shadow-2xs"
                          >
                            {HATICO_BRANCHES.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap border ${
                              row.branch_id === HATICO_BRANCHES[1].id
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : row.branch_id === HATICO_BRANCHES[2].id
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : row.branch_id === HATICO_BRANCHES[3].id
                                    ? "bg-purple-50 text-purple-800 border-purple-200"
                                    : row.branch_id === HATICO_BRANCHES[4].id
                                      ? "bg-sky-50 text-sky-800 border-sky-200"
                                      : "bg-slate-100 text-slate-800 border-slate-200"
                            }`}
                            title={
                              HATICO_BRANCHES.find(
                                (b) =>
                                  b.id ===
                                  (row.branch_id || HATICO_BRANCHES[0].id),
                              )?.name || "Hatico Việt Nam – Tổng kho"
                            }
                          >
                            {row.branch_id === HATICO_BRANCHES[0].id
                              ? "Tổng kho"
                              : row.branch_id === HATICO_BRANCHES[1].id
                                ? "Tây Nguyên"
                                : row.branch_id === HATICO_BRANCHES[2].id
                                  ? "Đồng Nai"
                                  : row.branch_id === HATICO_BRANCHES[3].id
                                    ? "Hoàng Mai"
                                    : row.branch_id === HATICO_BRANCHES[4].id
                                      ? "Quảng Trị"
                                      : "Tổng kho"}
                          </span>
                        )}
                      </td>

                      {/* Tiêu đề / Nội dung */}
                      <td className="px-4 py-2.5">
                        {isEditing ? (
                          <input
                            ref={(el) => {
                              if (el) postTitleRefs.current.set(row.rowId, el);
                              else postTitleRefs.current.delete(row.rowId);
                            }}
                            type="text"
                            placeholder="Nhập tiêu đề video/bài đăng..."
                            value={row.title}
                            onChange={(e) =>
                              updatePostRow(row.rowId, "title", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                finishEditRow(row.rowId);
                              }
                            }}
                            className="w-full h-8 px-2 text-xs font-semibold text-slate-900 bg-white border border-primary/40 rounded focus:outline-none focus:ring-1 focus:ring-primary/30 shadow-2xs"
                          />
                        ) : (
                          <div
                            onClick={() => startEditRow(row.rowId)}
                            className="cursor-pointer group flex items-center justify-between gap-2"
                            title="Bấm để chỉnh sửa"
                          >
                            <span className="font-semibold text-slate-900 text-[13px] leading-tight">
                              {row.title || "—"}
                            </span>
                            <svg
                              className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </div>
                        )}
                      </td>

                      {/* Đường dẫn (Link) */}
                      <td className="px-4 py-2.5">
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="https://..."
                            value={row.link}
                            onChange={(e) =>
                              updatePostRow(row.rowId, "link", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                finishEditRow(row.rowId);
                              }
                            }}
                            className="w-full h-8 px-2 text-xs text-slate-700 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary/30 font-mono shadow-2xs"
                          />
                        ) : row.link ? (
                          <a
                            href={
                              row.link.startsWith("http")
                                ? row.link
                                : `https://${row.link}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-[11px] truncate max-w-[220px]"
                            title={row.link}
                          >
                            <span className="truncate">{row.link}</span>
                            <svg
                              className="w-3 h-3 shrink-0 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-slate-300 select-none font-normal">
                            —
                          </span>
                        )}
                      </td>

                      {/* Lượt xem (Views) */}
                      <td className="px-3 py-2.5 text-center">
                        {isEditing ? (
                          <AdminSelect
                            compact
                            value={row.views}
                            onChange={(val) =>
                              updatePostRow(row.rowId, "views", val, true)
                            }
                            options={VIEW_OPTIONS}
                            className="w-full"
                          />
                        ) : row.views ? (
                          <span
                            className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap border ${
                              row.views.includes("> 10k") ||
                              row.views.includes(">10k")
                                ? "bg-purple-50 text-purple-700 border-purple-200/70"
                                : row.views.includes(">5k")
                                  ? "bg-amber-50 text-amber-700 border-amber-200/70"
                                  : row.views.includes(">2k")
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                                    : "bg-slate-100 text-slate-700 border-slate-200/70"
                            }`}
                          >
                            {row.views}
                          </span>
                        ) : (
                          <span className="text-slate-300 select-none font-normal">
                            —
                          </span>
                        )}
                      </td>

                      {/* Ngày */}
                      <td className="px-3 py-2.5 text-center">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDatePicker({
                                rowId: row.rowId,
                                value: row.report_date,
                              })
                            }
                            className="w-full h-8 flex items-center justify-center gap-1.5 px-2 text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer shadow-2xs"
                          >
                            <span>
                              {formatDateButtonLabel(row.report_date)}
                            </span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 bg-slate-100/90 border border-slate-200/70 font-mono">
                            {formatDateDisplay(row.report_date)}
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => finishEditRow(row.rowId)}
                              title="Hoàn tất chỉnh sửa (hoặc bấm ra ngoài để tự lưu)"
                              aria-label="Hoàn tất"
                              className="w-7 h-7 inline-flex items-center justify-center rounded border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.4}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditRow(row.rowId)}
                              title="Chỉnh sửa bài đăng"
                              aria-label="Sửa"
                              className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPosts(new Set([row.rowId]));
                              handleDeleteSelected();
                            }}
                            title="Xóa bài đăng"
                            aria-label="Xóa"
                            className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-rose-700 hover:bg-rose-50/60 hover:border-rose-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.4}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
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

      <MarketingExcelPreviewModal
        open={showExcelPreview}
        onClose={() => setShowExcelPreview(false)}
        onConfirm={handleConfirmExportExcel}
        period={period}
        staffName={
          selectedStaffId === "all"
            ? "Tất cả nhân sự"
            : marketingStaff.find((s) => s.id === selectedStaffId)?.full_name ||
              profile.full_name
        }
        branchName={
          filterBranch !== "all"
            ? HATICO_BRANCHES.find((b) => b.id === filterBranch)?.name
            : profile.department?.branch
              ? `${profile.department.name} - ${profile.department.branch.name}`
              : profile.department?.name
        }
        posts={displayedPosts.filter((p) => p.title.trim())}
        events={events.filter((e) => e.event_name.trim())}
      />

      {activeDatePicker && (
        <DatePickerModal
          open={!!activeDatePicker}
          value={activeDatePicker.value}
          onClose={() => {
            const rowId = activeDatePicker.rowId;
            setActiveDatePicker(null);
            setTimeout(() => {
              const rowEl = rowRefs.current.get(rowId);
              if (
                rowEl &&
                document.activeElement &&
                rowEl.contains(document.activeElement)
              ) {
                return;
              }
              finishEditRow(rowId);
            }, 100);
          }}
          onSelect={(newDate) => {
            const rowId = activeDatePicker.rowId;
            updatePostRow(rowId, "report_date", newDate, true);
            setActiveDatePicker(null);
            setTimeout(() => {
              const rowEl = rowRefs.current.get(rowId);
              if (
                rowEl &&
                document.activeElement &&
                rowEl.contains(document.activeElement)
              ) {
                return;
              }
              finishEditRow(rowId);
            }, 100);
          }}
        />
      )}
    </div>
  );
}

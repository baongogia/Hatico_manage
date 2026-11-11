"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  getWorkReportStaffList,
  getWorkReport,
  saveWorkReport,
  searchCustomerHistory,
  getWorkReportExportData,
  type WorkReportStaffItem,
  type WorkReportData,
  type Profile,
  type CustomerHistoryItem,
} from "../actions";
import {
  calculateWorkReportTotals,
  type CallReportEntry,
  type SalesPostActivity,
  type OtherWorkActivity,
  type MarketVisitActivity,
  type CallOutcome,
} from "@/lib/report-data";
import { downloadWorkReportExcel, downloadMultiStaffWorkReportZip } from "@/lib/work-report-export";
import { WorkExcelPreviewModal } from "./work-excel-preview-modal";
import { CustomDatePicker } from "@/components/ui/custom-datepicker";
import { SearchableStaffSelect } from "@/components/ui/searchable-staff-select";
import { CustomSelect } from "@/components/custom-select";
import { AppDialog, type DialogType } from "@/components/ui/app-dialog";

const CALL_OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: "no_answer", label: "Không nghe máy" },
  { value: "follow_up", label: "Cần theo dõi" },
  { value: "interested", label: "Quan tâm" },
  { value: "quote_sent", label: "Đã báo giá" },
  { value: "closed", label: "Chốt đơn / cọc" },
];

const PRESET_PLATFORMS = ["Facebook", "Zalo", "TikTok", "Chợ Tốt", "Khác"];

const TRAILER_TYPES = [
  "Ben",
  "Lồng",
  "Sàn",
  "Téc",
  "Siêu trường",
  "Lửng",
  "Xương",
];

const TASK_STATUS_OPTIONS = [
  { value: "completed", label: "Hoàn thành" },
  { value: "in_progress", label: "Đang làm" },
  { value: "pending", label: "Chờ xử lý" },
] as const;

type ActiveFormType = "call" | "post" | "other" | "visit" | null;

interface WorkReportPanelProps {
  profile: Profile;
  initialCalls?: CallReportEntry[];
}

export function WorkReportPanel({ profile }: WorkReportPanelProps) {
  // Format today in Vietnam time YYYY-MM-DD
  const getTodayVn = () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  };

  const todayStr = useMemo(() => getTodayVn(), []);

  // Staff and Date state
  const [currentDate, setCurrentDate] = useState<string>(todayStr);
  const [staffList, setStaffList] = useState<WorkReportStaffItem[]>([
    {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      branch_name: profile.department?.branch?.name || "Hatico",
      department_name: profile.department?.name,
    },
  ]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(profile.id);

  // Activities state
  const [calls, setCalls] = useState<CallReportEntry[]>([]);
  const [posts, setPosts] = useState<SalesPostActivity[]>([]);
  const [otherTasks, setOtherTasks] = useState<OtherWorkActivity[]>([]);
  const [visits, setVisits] = useState<MarketVisitActivity[]>([]);
  const [dailySummary, setDailySummary] = useState<string>("");
  const [closedOrders, setClosedOrders] = useState<number | undefined>(undefined);
  const [contractValue, setContractValue] = useState<string>("");

  // UI state
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(true);
  const [isSaving, startSaving] = useTransition();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Active inline form
  const [activeFormType, setActiveFormType] = useState<ActiveFormType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFormDetails, setShowFormDetails] = useState<boolean>(false);

  // Quick NLP text entry drawer
  const [showQuickText, setShowQuickText] = useState<boolean>(false);
  const [quickTextInput, setQuickTextInput] = useState<string>("");

  // Customer autofill search
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerHistoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Export modal
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Unsaved changes confirm dialog
  const [pendingSwitch, setPendingSwitch] = useState<{
    type: "date" | "staff";
    value: string;
  } | null>(null);

  // Platform selection state (Segmented button + custom input when "Khác")
  const [selectedPlatformTab, setSelectedPlatformTab] = useState<string>("Facebook");
  const [customPlatformText, setCustomPlatformText] = useState<string>("");

  // Form draft states
  const [callDraft, setCallDraft] = useState({
    customer_name: "",
    phone: "",
    province: "",
    trailer_type: "",
    price_quote: "",
    post_call_notes: "",
    result: "interested" as CallOutcome,
    follow_up_date: "",
  });

  const [postDraft, setPostDraft] = useState({
    quantity: 1,
    link_or_desc: "",
    inquiries_count: "" as string | number,
    additional_links: "",
  });

  const [otherDraft, setOtherDraft] = useState({
    task_name: "",
    status: "completed" as "completed" | "in_progress" | "pending",
    customer_name: "",
    result_obstacle: "",
    due_date: "",
  });

  const [visitDraft, setVisitDraft] = useState({
    location_customer: "",
    outcome: "",
    customers_visited_count: 1,
    next_action: "",
    expenses: "",
  });

  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

  // Application Modal state (replaces window.alert / confirm)
  const [appDialog, setAppDialog] = useState<{
    isOpen: boolean;
    type?: DialogType;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string | React.ReactNode,
    type: DialogType = "info"
  ) => {
    setAppDialog({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: () => setAppDialog((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const showConfirm = ({
    title,
    message,
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    isDestructive = false,
    onConfirm,
  }: {
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }) => {
    setAppDialog({
      isOpen: true,
      type: "confirm",
      title,
      message,
      confirmText,
      cancelText,
      isDestructive,
      onConfirm: () => {
        setAppDialog((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => setAppDialog((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const isManagerOrAdmin = profile.role !== "employee";
  const currentStaff = useMemo(() => {
    return staffList.find((s) => s.id === selectedStaffId) || staffList[0];
  }, [staffList, selectedStaffId]);

  // Load initial staff list
  useEffect(() => {
    let ignore = false;
    getWorkReportStaffList().then((res) => {
      if (ignore || "error" in res) return;
      setStaffList(res.staff);
      if (res.currentStaffId && !res.staff.some((s) => s.id === selectedStaffId)) {
        setSelectedStaffId(res.currentStaffId);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  // Load report data for selectedStaffId & currentDate
  const fetchReport = useCallback(
    async (staffId: string, date: string) => {
      setIsLoadingReport(true);
      setStatusMessage(null);
      const res = await getWorkReport({ staffId, date });
      setIsLoadingReport(false);

      if ("error" in res) {
        setStatusMessage({ text: res.error, isError: true });
        return;
      }

      setCalls(res.calls || []);
      setPosts(res.posts || []);
      setOtherTasks(res.otherTasks || []);
      setVisits(res.visits || []);
      setDailySummary(res.dailySummary || "");
      setClosedOrders(res.closedOrders);
      setContractValue(res.contractValue || "");
      setHasUnsavedChanges(false);

      if (res.updatedAt) {
        const timeStr = new Date(res.updatedAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setLastSavedAt(timeStr);
      } else {
        setLastSavedAt(null);
      }
    },
    []
  );

  useEffect(() => {
    fetchReport(selectedStaffId, currentDate);
  }, [selectedStaffId, currentDate, fetchReport]);

  // Live totals calculation
  const totals = useMemo(() => {
    return calculateWorkReportTotals({
      calls,
      posts,
      otherTasks,
      visits,
      summary: {
        type: "daily_summary",
        summary: dailySummary,
        closed_orders: closedOrders,
        contract_value: contractValue,
      },
    });
  }, [calls, posts, otherTasks, visits, dailySummary, closedOrders, contractValue]);

  // Customer history autocomplete lookup
  const searchCustomerTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleCustomerQueryChange = (val: string) => {
    setCallDraft((prev) => ({ ...prev, customer_name: val }));
    setHasUnsavedChanges(true);

    if (searchCustomerTimeout.current) clearTimeout(searchCustomerTimeout.current);
    if (!val.trim()) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchCustomerTimeout.current = setTimeout(async () => {
      const results = await searchCustomerHistory(val);
      setCustomerSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 200);
  };

  const handleSelectCustomerSuggestion = (c: CustomerHistoryItem) => {
    setCallDraft((prev) => ({
      ...prev,
      customer_name: c.customer_name,
      phone: c.phone || prev.phone,
      province: c.province || prev.province,
      trailer_type: c.trailer_type || prev.trailer_type,
    }));
    setShowSuggestions(false);
    setHasUnsavedChanges(true);
  };

  // Safe switching handler with unsaved changes prompt
  const requestDateChange = (newDate: string) => {
    if (newDate === currentDate) return;
    if (hasUnsavedChanges) {
      setPendingSwitch({ type: "date", value: newDate });
    } else {
      setCurrentDate(newDate);
    }
  };

  const requestStaffChange = (newStaffId: string) => {
    if (newStaffId === selectedStaffId) return;
    if (hasUnsavedChanges) {
      setPendingSwitch({ type: "staff", value: newStaffId });
    } else {
      setSelectedStaffId(newStaffId);
    }
  };

  // Step Date: previous or next day
  const stepDate = (days: number) => {
    const [y, m, d] = currentDate.split("-").map((v) => parseInt(v, 10));
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const newY = dt.getFullYear();
    const newM = String(dt.getMonth() + 1).padStart(2, "0");
    const newD = String(dt.getDate()).padStart(2, "0");
    requestDateChange(`${newY}-${newM}-${newD}`);
  };

  // Perform Save to backend (Database persistence)
  const handleSaveReport = async () => {
    setStatusMessage(null);
    startSaving(async () => {
      const res = await saveWorkReport({
        staffId: selectedStaffId,
        date: currentDate,
        calls,
        posts,
        otherTasks,
        visits,
        dailySummary,
        closedOrders,
        contractValue,
        status: "submitted",
      });

      if ("error" in res) {
        setStatusMessage({ text: `Lỗi khi lưu: ${res.error}`, isError: true });
        return;
      }

      setHasUnsavedChanges(false);
      const timeStr = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastSavedAt(timeStr);
      setStatusMessage({ text: "Đã lưu báo cáo thành công!" });
      setTimeout(() => setStatusMessage(null), 3000);
    });
  };

  // Handle Switch Dialog Confirmation
  const confirmSaveAndSwitch = async () => {
    if (!pendingSwitch) return;
    const res = await saveWorkReport({
      staffId: selectedStaffId,
      date: currentDate,
      calls,
      posts,
      otherTasks,
      visits,
      dailySummary,
      closedOrders,
      contractValue,
      status: "submitted",
    });

    if ("error" in res) {
      setStatusMessage({ text: `Lưu thất bại: ${res.error}`, isError: true });
      setPendingSwitch(null);
      return;
    }

    setHasUnsavedChanges(false);
    if (pendingSwitch.type === "date") {
      setCurrentDate(pendingSwitch.value);
    } else {
      setSelectedStaffId(pendingSwitch.value);
    }
    setPendingSwitch(null);
  };

  const discardAndSwitch = () => {
    if (!pendingSwitch) return;
    setHasUnsavedChanges(false);
    if (pendingSwitch.type === "date") {
      setCurrentDate(pendingSwitch.value);
    } else {
      setSelectedStaffId(pendingSwitch.value);
    }
    setPendingSwitch(null);
  };

  // Open Add Form
  const openAddForm = (type: ActiveFormType) => {
    setActiveFormType(type);
    setEditingId(null);
    setShowFormDetails(false);
    setShowSuggestions(false);

    if (type === "call") {
      setCallDraft({
        customer_name: "",
        phone: "",
        province: "",
        trailer_type: "",
        price_quote: "",
        post_call_notes: "",
        result: "interested",
        follow_up_date: "",
      });
    } else if (type === "post") {
      setSelectedPlatformTab("Facebook");
      setCustomPlatformText("");
      setPostDraft({
        quantity: 1,
        link_or_desc: "",
        inquiries_count: "",
        additional_links: "",
      });
    } else if (type === "other") {
      setOtherDraft({
        task_name: "",
        status: "completed",
        customer_name: "",
        result_obstacle: "",
        due_date: "",
      });
    } else if (type === "visit") {
      setVisitDraft({
        location_customer: "",
        outcome: "",
        customers_visited_count: 1,
        next_action: "",
        expenses: "",
      });
    }
  };

  // Open Edit Form
  const openEditCall = (c: CallReportEntry) => {
    setActiveFormType("call");
    setEditingId(c.id || c.customer_name);
    setShowFormDetails(Boolean(c.province || c.trailer_type || c.price_quote || c.follow_up_date));
    setCallDraft({
      customer_name: c.customer_name || "",
      phone: c.phone || "",
      province: c.province || "",
      trailer_type: c.trailer_type || "",
      price_quote: c.price_quote || "",
      post_call_notes: c.post_call_notes || "",
      result: (c.result as CallOutcome) || "interested",
      follow_up_date: c.follow_up_date || "",
    });
  };

  const openEditPost = (p: SalesPostActivity) => {
    setActiveFormType("post");
    setEditingId(p.id || p.platform);
    if (PRESET_PLATFORMS.includes(p.platform)) {
      setSelectedPlatformTab(p.platform);
      setCustomPlatformText("");
    } else {
      setSelectedPlatformTab("Khác");
      setCustomPlatformText(p.platform);
    }
    setShowFormDetails(Boolean(p.inquiries_count || p.additional_links));
    setPostDraft({
      quantity: p.quantity,
      link_or_desc: p.link_or_desc || "",
      inquiries_count: p.inquiries_count ?? "",
      additional_links: p.additional_links || "",
    });
  };

  const openEditOther = (t: OtherWorkActivity) => {
    setActiveFormType("other");
    setEditingId(t.id || t.task_name);
    setShowFormDetails(Boolean(t.customer_name || t.result_obstacle || t.due_date));
    setOtherDraft({
      task_name: t.task_name,
      status: t.status,
      customer_name: t.customer_name || "",
      result_obstacle: t.result_obstacle || "",
      due_date: t.due_date || "",
    });
  };

  const openEditVisit = (v: MarketVisitActivity) => {
    setActiveFormType("visit");
    setEditingId(v.id || v.location_customer);
    setShowFormDetails(
      Boolean(
        (v.customers_visited_count && v.customers_visited_count > 1) ||
          v.next_action ||
          v.expenses
      )
    );
    setVisitDraft({
      location_customer: v.location_customer,
      outcome: v.outcome,
      customers_visited_count: v.customers_visited_count || 1,
      next_action: v.next_action || "",
      expenses: v.expenses || "",
    });
  };

  // Add Draft into Daily Activity List
  const saveCurrentDraft = (keepOpenAndAddAnother = false) => {
    if (activeFormType === "call") {
      if (!callDraft.customer_name.trim() && !callDraft.phone.trim()) {
        showAlert(
          "Thiếu thông tin cuộc gọi",
          "Vui lòng nhập tên khách hàng hoặc số điện thoại để lưu hoạt động.",
          "error"
        );
        return;
      }
      const entry: CallReportEntry = {
        type: "call",
        id: editingId || crypto.randomUUID(),
        customer_name: callDraft.customer_name.trim(),
        phone: callDraft.phone.trim(),
        province: callDraft.province.trim(),
        trailer_type: callDraft.trailer_type.trim(),
        price_quote: callDraft.price_quote.trim(),
        post_call_notes: callDraft.post_call_notes.trim(),
        result: callDraft.result,
        follow_up_date: callDraft.follow_up_date.trim() || undefined,
      };

      setCalls((prev) => {
        if (editingId) {
          return prev.map((c) => ((c.id || c.customer_name) === editingId ? entry : c));
        }
        return [...prev, entry];
      });

      if (keepOpenAndAddAnother) {
        setCallDraft({
          customer_name: "",
          phone: "",
          province: "",
          trailer_type: "",
          price_quote: "",
          post_call_notes: "",
          result: "interested",
          follow_up_date: "",
        });
        setEditingId(null);
      } else {
        setActiveFormType(null);
      }
    } else if (activeFormType === "post") {
      const platformName =
        selectedPlatformTab === "Khác"
          ? customPlatformText.trim() || "Khác"
          : selectedPlatformTab;

      const entry: SalesPostActivity = {
        type: "post",
        id: editingId || crypto.randomUUID(),
        platform: platformName,
        quantity: Math.max(1, Number(postDraft.quantity) || 1),
        link_or_desc: postDraft.link_or_desc.trim() || undefined,
        inquiries_count:
          postDraft.inquiries_count !== "" && !isNaN(Number(postDraft.inquiries_count))
            ? Number(postDraft.inquiries_count)
            : undefined,
        additional_links: postDraft.additional_links.trim() || undefined,
      };

      setPosts((prev) => {
        if (editingId) {
          return prev.map((p) => ((p.id || p.platform) === editingId ? entry : p));
        }
        return [...prev, entry];
      });

      if (keepOpenAndAddAnother) {
        setPostDraft({
          quantity: 1,
          link_or_desc: "",
          inquiries_count: "",
          additional_links: "",
        });
        setEditingId(null);
      } else {
        setActiveFormType(null);
      }
    } else if (activeFormType === "other") {
      if (!otherDraft.task_name.trim()) {
        showAlert(
          "Thiếu nội dung công việc",
          "Vui lòng nhập nội dung công việc cần ghi nhận.",
          "error"
        );
        return;
      }
      const entry: OtherWorkActivity = {
        type: "other_task",
        id: editingId || crypto.randomUUID(),
        task_name: otherDraft.task_name.trim(),
        status: otherDraft.status,
        customer_name: otherDraft.customer_name.trim() || undefined,
        result_obstacle: otherDraft.result_obstacle.trim() || undefined,
        due_date: otherDraft.due_date.trim() || undefined,
      };

      setOtherTasks((prev) => {
        if (editingId) {
          return prev.map((t) => ((t.id || t.task_name) === editingId ? entry : t));
        }
        return [...prev, entry];
      });

      if (keepOpenAndAddAnother) {
        setOtherDraft({
          task_name: "",
          status: "completed",
          customer_name: "",
          result_obstacle: "",
          due_date: "",
        });
        setEditingId(null);
      } else {
        setActiveFormType(null);
      }
    } else if (activeFormType === "visit") {
      if (!visitDraft.location_customer.trim()) {
        showAlert(
          "Thiếu địa điểm / khách hàng",
          "Vui lòng nhập khu vực hoặc khách hàng đã gặp.",
          "error"
        );
        return;
      }
      const entry: MarketVisitActivity = {
        type: "visit",
        id: editingId || crypto.randomUUID(),
        location_customer: visitDraft.location_customer.trim(),
        outcome: visitDraft.outcome.trim() || "Đã gặp",
        customers_visited_count: Math.max(1, Number(visitDraft.customers_visited_count) || 1),
        next_action: visitDraft.next_action.trim() || undefined,
        expenses: visitDraft.expenses.trim() || undefined,
      };

      setVisits((prev) => {
        if (editingId) {
          return prev.map((v) => ((v.id || v.location_customer) === editingId ? entry : v));
        }
        return [...prev, entry];
      });

      if (keepOpenAndAddAnother) {
        setVisitDraft({
          location_customer: "",
          outcome: "",
          customers_visited_count: 1,
          next_action: "",
          expenses: "",
        });
        setEditingId(null);
      } else {
        setActiveFormType(null);
      }
    }

    setHasUnsavedChanges(true);
  };

  // Delete handlers with Custom Application Confirm Modal
  const deleteCall = (idOrName: string) => {
    showConfirm({
      title: "Xóa cuộc gọi",
      message: "Bạn có chắc chắn muốn xóa cuộc gọi này khỏi danh sách báo cáo?",
      confirmText: "Xóa cuộc gọi",
      isDestructive: true,
      onConfirm: () => {
        setCalls((prev) => prev.filter((c) => (c.id || c.customer_name) !== idOrName));
        setHasUnsavedChanges(true);
      },
    });
  };

  const deletePost = (idOrPlat: string) => {
    showConfirm({
      title: "Xóa bài đăng",
      message: "Bạn có chắc chắn muốn xóa bài đăng này khỏi danh sách?",
      confirmText: "Xóa bài đăng",
      isDestructive: true,
      onConfirm: () => {
        setPosts((prev) => prev.filter((p) => (p.id || p.platform) !== idOrPlat));
        setHasUnsavedChanges(true);
      },
    });
  };

  const deleteOther = (idOrName: string) => {
    showConfirm({
      title: "Xóa công việc",
      message: "Bạn có chắc chắn muốn xóa công việc này khỏi danh sách?",
      confirmText: "Xóa công việc",
      isDestructive: true,
      onConfirm: () => {
        setOtherTasks((prev) => prev.filter((t) => (t.id || t.task_name) !== idOrName));
        setHasUnsavedChanges(true);
      },
    });
  };

  const deleteVisit = (idOrLoc: string) => {
    showConfirm({
      title: "Xóa hoạt động thị trường",
      message: "Bạn có chắc chắn muốn xóa hoạt động thị trường này khỏi danh sách?",
      confirmText: "Xóa hoạt động",
      isDestructive: true,
      onConfirm: () => {
        setVisits((prev) => prev.filter((v) => (v.id || v.location_customer) !== idOrLoc));
        setHasUnsavedChanges(true);
      },
    });
  };

  // Quick NLP Text Parser
  const handleParseQuickText = () => {
    if (!quickTextInput.trim()) return;

    const chunks = quickTextInput
      .split(/[;\n•]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const newCalls: CallReportEntry[] = [];
    const newPosts: SalesPostActivity[] = [];
    const newOther: OtherWorkActivity[] = [];
    const newVisits: MarketVisitActivity[] = [];

    for (const chunk of chunks) {
      const lower = chunk.toLowerCase();

      if (lower.startsWith("đăng") || lower.includes("bài") || lower.includes("post")) {
        const qtyMatch = chunk.match(/(\d+)\s*(bài|post)/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        let platform = "Facebook";
        if (lower.includes("zalo")) platform = "Zalo";
        else if (lower.includes("tiktok")) platform = "TikTok";
        else if (lower.includes("chợ tốt") || lower.includes("chotot")) platform = "Chợ Tốt";

        newPosts.push({
          type: "post",
          id: crypto.randomUUID(),
          platform,
          quantity: qty,
          link_or_desc: chunk,
        });
        continue;
      }

      if (
        lower.startsWith("gặp") ||
        lower.includes("thị trường") ||
        lower.includes("đi gặp") ||
        lower.includes("đi hải phòng")
      ) {
        newVisits.push({
          type: "visit",
          id: crypto.randomUUID(),
          location_customer: chunk,
          outcome: "Đã trao đổi",
          customers_visited_count: 1,
        });
        continue;
      }

      if (
        lower.startsWith("gọi") ||
        lower.startsWith("chăm") ||
        lower.startsWith("alo") ||
        lower.includes("khách") ||
        lower.includes("báo giá") ||
        lower.includes("quan tâm")
      ) {
        let result: CallOutcome = "interested";
        if (lower.includes("không nghe") || lower.includes("bận")) result = "no_answer";
        else if (lower.includes("báo giá")) result = "quote_sent";
        else if (lower.includes("chốt") || lower.includes("cọc")) result = "closed";
        else if (lower.includes("theo dõi") || lower.includes("hẹn")) result = "follow_up";

        const phoneMatch = chunk.match(/(0\d{9,10})/);
        const phone = phoneMatch ? phoneMatch[1] : "";

        let trailer = "";
        for (const t of TRAILER_TYPES) {
          if (lower.includes(t.toLowerCase())) {
            trailer = t;
            break;
          }
        }

        newCalls.push({
          type: "call",
          id: crypto.randomUUID(),
          customer_name: chunk.replace(/^gọi\s+/i, "").replace(/^chăm\s+/i, "").slice(0, 40),
          phone,
          trailer_type: trailer,
          province: "",
          price_quote: "",
          post_call_notes: chunk,
          result,
        });
        continue;
      }

      newOther.push({
        type: "other_task",
        id: crypto.randomUUID(),
        task_name: chunk,
        status: "completed",
      });
    }

    if (newCalls.length || newPosts.length || newOther.length || newVisits.length) {
      setCalls((prev) => [...prev, ...newCalls]);
      setPosts((prev) => [...prev, ...newPosts]);
      setOtherTasks((prev) => [...prev, ...newOther]);
      setVisits((prev) => [...prev, ...newVisits]);
      setHasUnsavedChanges(true);
      setQuickTextInput("");
      setShowQuickText(false);
      setStatusMessage({ text: "Đã thêm các hoạt động vào danh sách. Hãy rà soát lại trước khi lưu báo cáo." });
    }
  };

  // Excel Export Handler
  const handleExportConfirm = async (config: {
    startDate: string;
    endDate: string;
    staffIds: string[];
    includeDetails: boolean;
  }) => {
    setIsExporting(true);
    setStatusMessage(null);

    try {
      const data = await getWorkReportExportData({
        staffIds: config.staffIds,
        startDate: config.startDate,
        endDate: config.endDate,
      });

      if ("error" in data) {
        showAlert("Lỗi xuất dữ liệu", data.error, "error");
        setIsExporting(false);
        return;
      }

      if (data.length === 1) {
        const single = data[0];
        await downloadWorkReportExcel({
          staffName: single.staff.full_name,
          branchName: single.staff.department?.branch?.name || "Hatico",
          departmentName: single.staff.department?.name,
          startDate: config.startDate,
          endDate: config.endDate,
          dailyReports: single.dailyReports,
          includeDetails: config.includeDetails,
        });
      } else {
        const staffOpts = data.map((d) => ({
          staffName: d.staff.full_name,
          branchName: d.staff.department?.branch?.name || "Hatico",
          departmentName: d.staff.department?.name,
          startDate: config.startDate,
          endDate: config.endDate,
          dailyReports: d.dailyReports,
          includeDetails: config.includeDetails,
        }));
        await downloadMultiStaffWorkReportZip(staffOpts, config.startDate, config.endDate);
      }

      setShowExportModal(false);
    } catch (err) {
      console.error(err);
      showAlert(
        "Lỗi tạo file Excel",
        "Đã xảy ra lỗi khi tạo file Excel. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.",
        "error"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const totalActivitiesCount = calls.length + posts.length + visits.length + otherTasks.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F7F8FA]">
      {/* 1. COMPACT PAGE HEADER & TOP TOOLBAR */}
      <div className="bg-white border-b border-[#E4E7EC] px-3.5 sm:px-6 py-2.5 sm:py-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Title + Context */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-[#17365D] tracking-tight truncate">
                Báo cáo công việc
              </h1>
              {/* Save status badge (Desktop only here, mobile displays it in bottom bar) */}
              <div className="hidden sm:inline-flex">
                {isSaving ? (
                  <span className="text-xs text-[#17365D] font-medium inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#EDF2F8]">
                    <svg className="w-3 h-3 animate-spin text-[#17365D]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Đang lưu...
                  </span>
                ) : hasUnsavedChanges ? (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded font-medium inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Chưa lưu
                  </span>
                ) : lastSavedAt ? (
                  <span className="text-xs text-[#027A48] bg-[#ECFDF3] border border-[#ABEFC6] px-2 py-0.5 rounded font-medium inline-flex items-center gap-1">
                    <svg className="w-3 h-3 text-[#027A48]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Đã lưu {lastSavedAt}
                  </span>
                ) : null}
              </div>
            </div>
            {/* Subtitle (Hidden on mobile to save vertical space) */}
            <p className="hidden sm:block text-xs text-[#667085] mt-0.5">
              Theo dõi và ghi nhận hoạt động kinh doanh hàng ngày
            </p>
          </div>

          {/* Mobile Secondary Action: Xuất Excel next to Title */}
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="sm:hidden h-8 px-2.5 text-xs font-semibold text-[#344054] bg-white border border-[#E4E7EC] hover:bg-[#F9FAFB] active:bg-[#F2F4F7] rounded-md transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Xuất Excel"
          >
            <svg className="w-3.5 h-3.5 text-[#027A48]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M14 2v6h6" />
              <path d="M10 12l4 4m0-4l-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>Xuất Excel</span>
          </button>

          {/* Desktop: Header Actions */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="h-9 px-3.5 text-xs font-semibold text-[#344054] bg-white border border-[#E4E7EC] hover:bg-[#F9FAFB] hover:border-[#D0D5DD] rounded-md transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4 text-[#027A48]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                <path d="M14 2v6h6" />
                <path d="M10 12l4 4m0-4l-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={handleSaveReport}
              disabled={isSaving}
              className="h-9 px-4 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#112B4B] rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              <span>Lưu báo cáo</span>
            </button>
          </div>
        </div>

        {/* Controls Sub-Bar: Employee & Custom Datepicker Navigation */}
        <div className="flex flex-col min-[370px]:flex-row min-[370px]:items-center justify-between gap-2 sm:gap-3 pt-2.5 sm:pt-3 mt-2 sm:mt-2.5 border-t border-[#F2F4F7]">
          {/* Employee Selector (Custom Searchable) */}
          {isManagerOrAdmin ? (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 sm:flex-initial">
              <span className="text-xs font-medium text-[#667085] hidden sm:inline">
                Nhân viên:
              </span>
              <SearchableStaffSelect
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                onSelect={requestStaffChange}
                className="w-full sm:w-auto"
              />
            </div>
          ) : (
            <div className="h-9 px-2.5 sm:px-3 bg-[#F7F8FA] border border-[#E4E7EC] rounded-md flex items-center gap-2 text-xs flex-1 min-w-0 sm:flex-initial truncate">
              <div className="w-5 h-5 rounded-full bg-[#17365D] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {profile.full_name.charAt(0)}
              </div>
              <span className="font-semibold text-[#202936] truncate">{profile.full_name}</span>
              <span className="text-[#667085] text-[11px] truncate hidden min-[400px]:inline">
                ({profile.department?.branch?.name || "Kinh doanh"})
              </span>
            </div>
          )}

          <div className="h-4 w-px bg-[#E4E7EC] hidden sm:block" />

          {/* Date Picker Controls with Centered SVG Chevrons */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 justify-end">
            <button
              type="button"
              onClick={() => stepDate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-md border border-[#E4E7EC] bg-white hover:bg-[#F9FAFB] hover:border-[#D0D5DD] active:bg-[#EDF2F8] text-[#667085] hover:text-[#202936] transition-colors shadow-xs cursor-pointer shrink-0"
              title="Ngày trước"
              aria-label="Ngày trước"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <CustomDatePicker value={currentDate} onChange={requestDateChange} className="shrink-0" />

            <button
              type="button"
              onClick={() => stepDate(1)}
              className="w-9 h-9 flex items-center justify-center rounded-md border border-[#E4E7EC] bg-white hover:bg-[#F9FAFB] hover:border-[#D0D5DD] active:bg-[#EDF2F8] text-[#667085] hover:text-[#202936] transition-colors shadow-xs cursor-pointer shrink-0"
              title="Ngày sau"
              aria-label="Ngày sau"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Status notification banner if any */}
        {statusMessage && (
          <div
            className={`mt-2.5 text-xs py-2 px-3 rounded-md flex items-center justify-between ${
              statusMessage.isError
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-[#667085] hover:text-[#202936] ml-2 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-28 sm:pb-6 space-y-3.5 sm:space-y-4">
        {/* 2. LOW-HEIGHT METRICS STRIP (One compact strip replacing 5 large cards) */}
        <div className="bg-white border border-[#E4E7EC] rounded-lg p-2.5 sm:px-5 sm:py-3 shadow-xs">
          <div className="grid grid-cols-5 gap-1 sm:gap-4 divide-x divide-[#E4E7EC] text-center sm:text-left">
            {/* Metric 1: Khách liên hệ */}
            <div className="px-1 sm:px-0 sm:pr-4 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-medium text-[#667085] block truncate">
                <span className="sm:hidden">Liên hệ</span>
                <span className="hidden sm:inline">Khách liên hệ</span>
              </span>
              <div className="text-base sm:text-xl font-bold text-[#202936] mt-0.5 tracking-tight font-tabular">
                {totals.customerContacts}
              </div>
            </div>

            {/* Metric 2: Bài đăng */}
            <div className="px-1 sm:px-0 sm:px-4 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-medium text-[#667085] block truncate">
                Bài đăng
              </span>
              <div className="text-base sm:text-xl font-bold text-[#202936] mt-0.5 tracking-tight font-tabular">
                {totals.postsCount}
              </div>
            </div>

            {/* Metric 3: Việc hoàn thành */}
            <div className="px-1 sm:px-0 sm:px-4 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-medium text-[#667085] block truncate">
                <span className="sm:hidden">Xong việc</span>
                <span className="hidden sm:inline">Việc hoàn thành</span>
              </span>
              <div className="text-base sm:text-xl font-bold text-[#202936] mt-0.5 tracking-tight font-tabular">
                {totals.completedTasks}
                {otherTasks.length > 0 && (
                  <span className="text-[10px] sm:text-xs font-normal text-[#667085] ml-0.5 sm:ml-1">
                    /{otherTasks.length}
                  </span>
                )}
              </div>
            </div>

            {/* Metric 4: Khách gặp (Thị trường) */}
            <div className="px-1 sm:px-0 sm:px-4 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-medium text-[#667085] block truncate">
                <span className="sm:hidden">Gặp khách</span>
                <span className="hidden sm:inline">Khách gặp (thị trường)</span>
              </span>
              <div className="text-base sm:text-xl font-bold text-[#202936] mt-0.5 tracking-tight font-tabular">
                {totals.customersVisited}
                {totals.visitTrips > 0 && (
                  <span className="text-[10px] sm:text-xs font-normal text-[#667085] ml-0.5 sm:ml-1 hidden min-[380px]:inline">
                    ({totals.visitTrips})
                  </span>
                )}
              </div>
            </div>

            {/* Metric 5: Đơn chốt / cọc */}
            <div className="px-1 sm:px-0 sm:pl-4 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-medium text-[#667085] block truncate">
                <span className="sm:hidden">Chốt đơn</span>
                <span className="hidden sm:inline">Đơn chốt / cọc</span>
              </span>
              <div
                className={`text-base sm:text-xl font-bold mt-0.5 tracking-tight font-tabular ${
                  totals.closedOrders > 0 ? "text-[#027A48]" : "text-[#202936]"
                }`}
              >
                {totals.closedOrders}
              </div>
            </div>
          </div>
        </div>

        {/* 3. COHERENT QUICK-ADD ACTION GROUP (2x2 Grid on Mobile, Flex Inline on Desktop) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:inline-flex sm:rounded-lg sm:border sm:border-[#E4E7EC] sm:bg-white sm:p-1 sm:shadow-xs sm:gap-1">
            <button
              type="button"
              onClick={() => openAddForm("call")}
              className={`h-11 sm:h-8 px-3 text-xs font-semibold rounded-lg sm:rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
                activeFormType === "call"
                  ? "bg-[#17365D] text-white shadow-xs"
                  : "bg-white sm:bg-transparent border border-[#E4E7EC] sm:border-0 text-[#344054] hover:bg-[#F2F4F7] active:bg-[#EDF2F8]"
              }`}
            >
              <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <span className="sm:hidden">Chăm khách</span>
              <span className="hidden sm:inline">Gọi / chăm khách</span>
            </button>

            <button
              type="button"
              onClick={() => openAddForm("post")}
              className={`h-11 sm:h-8 px-3 text-xs font-semibold rounded-lg sm:rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
                activeFormType === "post"
                  ? "bg-[#17365D] text-white shadow-xs"
                  : "bg-white sm:bg-transparent border border-[#E4E7EC] sm:border-0 text-[#344054] hover:bg-[#F2F4F7] active:bg-[#EDF2F8]"
              }`}
            >
              <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span>Đăng bài</span>
            </button>

            <button
              type="button"
              onClick={() => openAddForm("visit")}
              className={`h-11 sm:h-8 px-3 text-xs font-semibold rounded-lg sm:rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
                activeFormType === "visit"
                  ? "bg-[#17365D] text-white shadow-xs"
                  : "bg-white sm:bg-transparent border border-[#E4E7EC] sm:border-0 text-[#344054] hover:bg-[#F2F4F7] active:bg-[#EDF2F8]"
              }`}
            >
              <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Đi thị trường</span>
            </button>

            <button
              type="button"
              onClick={() => openAddForm("other")}
              className={`h-11 sm:h-8 px-3 text-xs font-semibold rounded-lg sm:rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
                activeFormType === "other"
                  ? "bg-[#17365D] text-white shadow-xs"
                  : "bg-white sm:bg-transparent border border-[#E4E7EC] sm:border-0 text-[#344054] hover:bg-[#F2F4F7] active:bg-[#EDF2F8]"
              }`}
            >
              <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <span className="sm:hidden">Việc khác</span>
              <span className="hidden sm:inline">Công việc khác</span>
            </button>
          </div>

          {/* Quick text input toggle */}
          <button
            type="button"
            onClick={() => setShowQuickText((prev) => !prev)}
            className="text-xs font-medium text-[#17365D] hover:underline flex items-center justify-center sm:justify-start gap-1 cursor-pointer py-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{showQuickText ? "Đóng nhập nhanh" : "Nhập nhanh bằng văn bản"}</span>
          </button>
        </div>

        {/* Quick Text Box Drawer */}
        {showQuickText && (
          <div className="bg-white border border-[#E4E7EC] rounded-lg p-4 space-y-2.5 shadow-xs animate-in fade-in duration-100">
            <div className="flex items-center justify-between text-xs text-[#202936] font-semibold">
              <span>Nhập nhanh các hoạt động trong ngày (cách nhau bằng dấu chấm phẩy hoặc xuống dòng):</span>
              <button
                onClick={() => setShowQuickText(false)}
                className="text-[#667085] hover:text-[#202936] text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <textarea
              rows={2}
              value={quickTextInput}
              onChange={(e) => setQuickTextInput(e.target.value)}
              placeholder="VD: Gọi anh Nam 0912345678 quan tâm mooc ben, gửi báo giá; đăng 4 bài Facebook; chiều gặp khách ở Hải Phòng..."
              className="w-full text-xs p-2.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17365D] focus:border-[#17365D]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleParseQuickText}
                className="h-8 px-3.5 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#112B4B] rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Phân tích & thêm vào danh sách
              </button>
            </div>
          </div>
        )}

        {/* 4. SHARED INLINE ENTRY PANEL */}
        {activeFormType && (
          <div className="bg-white border border-[#E4E7EC] rounded-lg p-4 sm:p-5 space-y-3.5 shadow-xs animate-in fade-in duration-150">
            {/* Header with Outline Icon (No Emoji) */}
            <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-[#EDF2F8] text-[#17365D] flex items-center justify-center">
                  {activeFormType === "call" && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  )}
                  {activeFormType === "post" && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  )}
                  {activeFormType === "visit" && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                    </svg>
                  )}
                  {activeFormType === "other" && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  )}
                </span>
                <span className="text-xs font-semibold text-[#202936]">
                  {activeFormType === "call" && "Gọi / chăm sóc khách hàng"}
                  {activeFormType === "post" && "Đăng bài bán hàng"}
                  {activeFormType === "visit" && "Đi thị trường / Gặp khách"}
                  {activeFormType === "other" && "Công việc khác"}
                  {editingId && (
                    <span className="text-[#667085] font-normal ml-1.5">(chỉnh sửa)</span>
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActiveFormType(null)}
                className="text-[#667085] hover:text-[#202936] p-1 rounded hover:bg-[#F2F4F7] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* A: Form Gọi / Chăm khách */}
            {activeFormType === "call" && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  {/* Customer name */}
                  <div className="relative flex-1">
                    <label className="text-xs font-medium text-[#344054] block mb-1">
                      Tên khách hàng <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={callDraft.customer_name}
                      onChange={(e) => handleCustomerQueryChange(e.target.value)}
                      onFocus={() => {
                        if (customerSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      placeholder="VD: Anh Nam Hải Phòng..."
                      className="w-full h-9 px-3 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D] focus:border-[#17365D]"
                    />
                    {showSuggestions && customerSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-[#E4E7EC] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                        <div className="p-1.5 text-[10px] font-semibold text-[#667085] bg-[#F7F8FA] border-b border-[#E4E7EC]">
                          Gợi ý khách hàng từ lịch sử
                        </div>
                        {customerSuggestions.map((c, i) => (
                          <div
                            key={i}
                            onClick={() => handleSelectCustomerSuggestion(c)}
                            className="p-2 hover:bg-[#EDF2F8] cursor-pointer text-xs border-b border-[#F2F4F7] flex justify-between items-center"
                          >
                            <span className="font-semibold text-[#202936]">{c.customer_name}</span>
                            <span className="text-[#667085] text-[11px]">
                              {c.phone} {c.province ? `· ${c.province}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="w-full sm:w-44">
                    <label className="text-xs font-medium text-[#344054] block mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={callDraft.phone}
                      onChange={(e) => {
                        setCallDraft((prev) => ({ ...prev, phone: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="0912..."
                      className="w-full h-9 px-3 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D] focus:border-[#17365D]"
                    />
                  </div>

                  {/* Short note */}
                  <div className="flex-1">
                    <label className="text-xs font-medium text-[#344054] block mb-1">
                      Ghi chú nhanh
                    </label>
                    <input
                      type="text"
                      value={callDraft.post_call_notes}
                      onChange={(e) => {
                        setCallDraft((prev) => ({ ...prev, post_call_notes: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Nhu cầu, hẹn gặp, ý kiến..."
                      className="w-full h-9 px-3 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D] focus:border-[#17365D]"
                    />
                  </div>
                </div>

                {/* Neutral Outcome Segmented Buttons with Navy Selected State */}
                <div>
                  <label className="text-xs font-medium text-[#344054] block mb-1.5">
                    Kết quả cuộc gọi
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CALL_OUTCOMES.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => {
                          setCallDraft((prev) => ({ ...prev, result: o.value }));
                          setHasUnsavedChanges(true);
                        }}
                        className={`h-8 px-3 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                          callDraft.result === o.value
                            ? "bg-[#17365D] text-white border-[#17365D] font-semibold shadow-xs"
                            : "bg-white text-[#344054] border-[#E4E7EC] hover:bg-[#F9FAFB]"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discreet disclosure for optional fields */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowFormDetails((prev) => !prev)}
                    className="text-xs text-[#17365D] font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>
                      {showFormDetails
                        ? "− Thu gọn chi tiết"
                        : "+ Thêm chi tiết (loại mooc, giá báo, hẹn ngày)"}
                    </span>
                  </button>
                </div>

                {showFormDetails && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#F2F4F7]">
                    <div>
                      <label className="text-[11px] font-medium text-[#667085] block mb-1">
                        Sản phẩm / Loại mooc
                      </label>
                      <CustomSelect
                        value={callDraft.trailer_type}
                        onChange={(val) => {
                          setCallDraft((prev) => ({ ...prev, trailer_type: String(val) }));
                          setHasUnsavedChanges(true);
                        }}
                        options={[
                          { value: "", label: "— Bỏ trống —" },
                          ...TRAILER_TYPES.map((t) => ({ value: t, label: t })),
                        ]}
                        placeholder="— Chọn hoặc bỏ trống —"
                        size="sm"
                        portal={true}
                        allowClear={true}
                        searchable={true}
                        searchPlaceholder="Tìm loại mooc..."
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#667085] block mb-1">
                        Giá đã báo
                      </label>
                      <input
                        type="text"
                        value={callDraft.price_quote}
                        onChange={(e) => {
                          setCallDraft((prev) => ({ ...prev, price_quote: e.target.value }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="VD: 365 tr..."
                        className="w-full h-8 px-2.5 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#667085] block mb-1">
                        Hẹn liên hệ lại
                      </label>
                      <CustomDatePicker
                        value={callDraft.follow_up_date}
                        onChange={(newDate) => {
                          setCallDraft((prev) => ({ ...prev, follow_up_date: newDate }));
                          setHasUnsavedChanges(true);
                        }}
                        size="sm"
                        portal={true}
                        allowClear={true}
                        placeholder="Chọn ngày..."
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#667085] block mb-1">
                        Tỉnh thành / Khu vực
                      </label>
                      <input
                        type="text"
                        value={callDraft.province}
                        onChange={(e) => {
                          setCallDraft((prev) => ({ ...prev, province: e.target.value }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="VD: Hải Phòng..."
                        className="w-full h-8 px-2.5 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* B: Form Đăng bài */}
            {activeFormType === "post" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#344054] block">
                    Nền tảng đăng bài
                  </label>
                  {/* Single Clean Segmented Bar (No duplicate text input!) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {PRESET_PLATFORMS.map((plat) => (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => {
                          setSelectedPlatformTab(plat);
                          setHasUnsavedChanges(true);
                        }}
                        className={`h-8 px-3 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                          selectedPlatformTab === plat
                            ? "bg-[#17365D] text-white border-[#17365D] font-semibold shadow-xs"
                            : "bg-white text-[#344054] border-[#E4E7EC] hover:bg-[#F9FAFB]"
                        }`}
                      >
                        {plat}
                      </button>
                    ))}
                    {selectedPlatformTab === "Khác" && (
                      <input
                        type="text"
                        value={customPlatformText}
                        onChange={(e) => {
                          setCustomPlatformText(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Nhập tên nền tảng khác..."
                        className="h-8 px-2.5 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D] w-full sm:w-48"
                      />
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="w-full sm:w-36">
                    <label className="text-xs font-medium text-[#344054] block mb-1">
                      Số bài đăng
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={postDraft.quantity}
                      onChange={(e) => {
                        setPostDraft((prev) => ({
                          ...prev,
                          quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full h-9 px-3 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D]"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-xs font-medium text-[#344054] block mb-1">
                      Link hoặc mô tả bài viết (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={postDraft.link_or_desc}
                      onChange={(e) => {
                        setPostDraft((prev) => ({ ...prev, link_or_desc: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Link bài, nhóm đăng, chủ đề..."
                      className="w-full h-9 px-3 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D]"
                    />
                  </div>
                </div>

                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowFormDetails((prev) => !prev)}
                    className="text-xs text-[#17365D] font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>
                      {showFormDetails
                        ? "− Thu gọn chi tiết"
                        : "+ Thêm chi tiết (khách inbox, link bổ sung)"}
                    </span>
                  </button>
                </div>

                {showFormDetails && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#F2F4F7]">
                    <div>
                      <label className="text-[11px] font-medium text-[#667085] block mb-1">
                        Khách phát sinh (inbox / hỏi giá)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={postDraft.inquiries_count}
                        onChange={(e) => {
                          setPostDraft((prev) => ({
                            ...prev,
                            inquiries_count: e.target.value,
                          }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Số lượng..."
                        className="w-full h-8 px-2.5 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-[#667085] block mb-1">
                        Link bài viết bổ sung
                      </label>
                      <input
                        type="text"
                        value={postDraft.additional_links}
                        onChange={(e) => {
                          setPostDraft((prev) => ({
                            ...prev,
                            additional_links: e.target.value,
                          }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="https://..."
                        className="w-full h-8 px-2.5 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* C: Form Đi thị trường */}
            {activeFormType === "visit" && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-[#344054] block mb-1">
                      Khu vực hoặc khách hàng đã gặp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={visitDraft.location_customer}
                      onChange={(e) => {
                        setVisitDraft((prev) => ({ ...prev, location_customer: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="VD: KCN Đình Vũ, gặp anh Hải..."
                      className="w-full h-9 px-3 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D]"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-xs font-medium text-[#344054] block mb-1">
                      Kết quả tóm tắt
                    </label>
                    <input
                      type="text"
                      value={visitDraft.outcome}
                      onChange={(e) => {
                        setVisitDraft((prev) => ({ ...prev, outcome: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="VD: Trao đổi hợp đồng, khách ưng mẫu sàn..."
                      className="w-full h-9 px-3 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D]"
                    />
                  </div>
                </div>

                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowFormDetails((prev) => !prev)}
                    className="text-xs text-[#17365D] font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>
                      {showFormDetails
                        ? "− Thu gọn chi tiết"
                        : "+ Thêm chi tiết (số khách gặp, kế hoạch tiếp, chi phí)"}
                    </span>
                  </button>
                </div>

                {showFormDetails && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#F2F4F7]">
                    <div>
                      <label className="text-[11px] font-medium text-[#667085] block mb-1">
                        Số lượng khách gặp
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={visitDraft.customers_visited_count}
                        onChange={(e) => {
                          setVisitDraft((prev) => ({
                            ...prev,
                            customers_visited_count: Math.max(1, parseInt(e.target.value, 10) || 1),
                          }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full h-8 px-2.5 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#667085] block mb-1">
                        Hành động tiếp theo
                      </label>
                      <input
                        type="text"
                        value={visitDraft.next_action}
                        onChange={(e) => {
                          setVisitDraft((prev) => ({ ...prev, next_action: e.target.value }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="VD: Gửi mẫu hợp đồng thứ 5..."
                        className="w-full h-8 px-2.5 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#667085] block mb-1">
                        Chi phí thị trường (nếu có)
                      </label>
                      <input
                        type="text"
                        value={visitDraft.expenses}
                        onChange={(e) => {
                          setVisitDraft((prev) => ({ ...prev, expenses: e.target.value }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="VD: 250.000 đ..."
                        className="w-full h-8 px-2.5 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* D: Form Công việc khác */}
            {activeFormType === "other" && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-[#344054] block mb-1">
                      Nội dung công việc <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={otherDraft.task_name}
                      onChange={(e) => {
                        setOtherDraft((prev) => ({ ...prev, task_name: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="VD: Làm thủ tục đăng kiểm, bàn giao xe cho khách..."
                      className="w-full h-9 px-3 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D]"
                    />
                  </div>

                  <div className="w-full sm:w-44">
                    <label className="text-xs font-medium text-[#344054] block mb-1">
                      Trạng thái
                    </label>
                    <CustomSelect
                      value={otherDraft.status}
                      onChange={(val) => {
                        setOtherDraft((prev) => ({
                          ...prev,
                          status: val as "completed" | "in_progress" | "pending",
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      options={TASK_STATUS_OPTIONS}
                      size="md"
                      portal={true}
                    />
                  </div>
                </div>

                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowFormDetails((prev) => !prev)}
                    className="text-xs text-[#17365D] font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>
                      {showFormDetails
                        ? "− Thu gọn chi tiết"
                        : "+ Thêm chi tiết (khách liên quan, kết quả/vướng mắc, hạn)"}
                    </span>
                  </button>
                </div>

                {showFormDetails && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#F2F4F7]">
                    <div>
                      <label className="text-[11px] font-medium text-[#667085] block mb-1">
                        Khách hàng liên quan
                      </label>
                      <input
                        type="text"
                        value={otherDraft.customer_name}
                        onChange={(e) => {
                          setOtherDraft((prev) => ({ ...prev, customer_name: e.target.value }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full h-8 px-2.5 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#667085] block mb-1">
                        Kết quả / Vướng mắc
                      </label>
                      <input
                        type="text"
                        value={otherDraft.result_obstacle}
                        onChange={(e) => {
                          setOtherDraft((prev) => ({ ...prev, result_obstacle: e.target.value }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full h-8 px-2.5 text-base sm:text-xs bg-white border border-[#E4E7EC] rounded-md"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#667085] block mb-1">
                        Hạn hoàn thành
                      </label>
                      <CustomDatePicker
                        value={otherDraft.due_date}
                        onChange={(newDate) => {
                          setOtherDraft((prev) => ({ ...prev, due_date: newDate }));
                          setHasUnsavedChanges(true);
                        }}
                        size="sm"
                        portal={true}
                        allowClear={true}
                        placeholder="Chọn ngày..."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clear Aligned Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-[#E4E7EC]">
              <span className="text-[11px] text-[#667085] hidden sm:inline">
                Nhấn Enter để thêm nhanh vào danh sách
              </span>
              <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveFormType(null)}
                  className="h-10 sm:h-8 px-4 sm:px-3 text-xs font-medium text-[#667085] hover:text-[#202936] hover:bg-[#F2F4F7] active:bg-[#E4E7EC] rounded-md transition-colors cursor-pointer touch-manipulation"
                >
                  Hủy
                </button>
                {!editingId && (
                  <button
                    type="button"
                    onClick={() => saveCurrentDraft(true)}
                    className="h-10 sm:h-8 px-3.5 sm:px-3 text-xs font-semibold text-[#17365D] bg-[#EDF2F8] hover:bg-[#D9E2EC] active:bg-[#CCD9E8] rounded-md transition-colors cursor-pointer touch-manipulation hidden min-[400px]:inline-flex"
                  >
                    Thêm & tạo tiếp
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => saveCurrentDraft(false)}
                  className="h-10 sm:h-8 px-4 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#112B4B] active:bg-[#0D223B] rounded-md shadow-xs transition-colors cursor-pointer touch-manipulation flex-1 sm:flex-initial text-center justify-center"
                >
                  {editingId ? "Cập nhật" : "Lưu vào danh sách"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. ACTIVITY LIST */}
        <div className="bg-white border border-[#E4E7EC] rounded-lg shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E4E7EC] flex items-center justify-between bg-[#FAFAFA]">
            <h2 className="text-xs font-semibold text-[#202936]">
              Danh sách hoạt động ({totalActivitiesCount})
            </h2>
          </div>

          {isLoadingReport ? (
            <div className="py-12 text-center text-xs text-[#667085]">
              Đang tải báo cáo của nhân viên...
            </div>
          ) : totalActivitiesCount === 0 ? (
            /* Restrained, compact empty state (Section 8) */
            <div className="py-8 px-4 text-center">
              <p className="text-xs text-[#667085]">
                Chưa có hoạt động nào được ghi nhận cho ngày này.
              </p>
              <button
                type="button"
                onClick={() => openAddForm("call")}
                className="mt-2 text-xs font-semibold text-[#17365D] hover:underline cursor-pointer"
              >
                + Thêm hoạt động đầu tiên
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#E4E7EC]">
              {/* Group 1: Calls */}
              {calls.map((c, i) => (
                <div
                  key={c.id || i}
                  className="p-3 sm:px-4 sm:py-3 flex items-start justify-between gap-3 hover:bg-[#F9FAFB] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-7 h-7 rounded bg-[#F2F4F7] text-[#17365D] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <strong className="text-[#202936] font-semibold">
                          {c.customer_name || c.phone}
                        </strong>
                        {c.phone && c.customer_name && (
                          <span className="text-[#667085] font-mono text-[11px]">
                            ({c.phone})
                          </span>
                        )}
                        {c.province && (
                          <span className="text-[#98A2B3] text-[11px]">· {c.province}</span>
                        )}
                        {c.trailer_type && (
                          <span className="text-[11px] text-[#344054] bg-[#F2F4F7] px-1.5 py-0.2 rounded font-medium">
                            Mooc {c.trailer_type}
                          </span>
                        )}
                        {c.price_quote && (
                          <span className="text-[#17365D] text-[11px] font-semibold">
                            Báo: {c.price_quote}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#F2F4F7] text-[#344054]">
                          {CALL_OUTCOMES.find((o) => o.value === c.result)?.label || c.result}
                        </span>
                        {c.post_call_notes && (
                          <span className="text-[#667085]">{c.post_call_notes}</span>
                        )}
                        {c.follow_up_date && (
                          <span className="text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded text-[10px] font-medium">
                            Hẹn: {c.follow_up_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditCall(c)}
                      className="p-1 text-[#667085] hover:text-[#17365D] hover:bg-[#F2F4F7] rounded cursor-pointer"
                      title="Sửa"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCall(c.id || c.customer_name)}
                      className="p-1 text-[#667085] hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      title="Xóa"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Group 2: Posts */}
              {posts.map((p, i) => (
                <div
                  key={p.id || i}
                  className="p-3 sm:px-4 sm:py-3 flex items-start justify-between gap-3 hover:bg-[#F9FAFB] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-7 h-7 rounded bg-[#F2F4F7] text-[#17365D] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <strong className="text-[#202936] font-semibold">{p.platform}</strong>
                        <span className="text-[#667085]">({p.quantity} bài)</span>
                        {p.inquiries_count ? (
                          <span className="text-[#027A48] bg-[#ECFDF3] px-1.5 py-0.2 rounded text-[10px] font-medium">
                            {p.inquiries_count} khách hỏi
                          </span>
                        ) : null}
                      </div>
                      {p.link_or_desc && (
                        <div className="text-[11px] text-[#667085] mt-1">{p.link_or_desc}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditPost(p)}
                      className="p-1 text-[#667085] hover:text-[#17365D] hover:bg-[#F2F4F7] rounded cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePost(p.id || p.platform)}
                      className="p-1 text-[#667085] hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Group 3: Visits */}
              {visits.map((v, i) => (
                <div
                  key={v.id || i}
                  className="p-3 sm:px-4 sm:py-3 flex items-start justify-between gap-3 hover:bg-[#F9FAFB] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-7 h-7 rounded bg-[#F2F4F7] text-[#17365D] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <strong className="text-[#202936] font-semibold">{v.location_customer}</strong>
                        {v.customers_visited_count && v.customers_visited_count > 1 && (
                          <span className="text-[#667085] text-[11px]">
                            ({v.customers_visited_count} khách gặp)
                          </span>
                        )}
                        {v.expenses && (
                          <span className="text-[#667085] text-[11px]">· Chi phí: {v.expenses}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#667085] mt-1">
                        Kết quả: {v.outcome}
                        {v.next_action && <span className="text-[#98A2B3]"> · Tiếp: {v.next_action}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditVisit(v)}
                      className="p-1 text-[#667085] hover:text-[#17365D] hover:bg-[#F2F4F7] rounded cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteVisit(v.id || v.location_customer)}
                      className="p-1 text-[#667085] hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Group 4: Other Work */}
              {otherTasks.map((t, i) => (
                <div
                  key={t.id || i}
                  className="p-3 sm:px-4 sm:py-3 flex items-start justify-between gap-3 hover:bg-[#F9FAFB] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-7 h-7 rounded bg-[#F2F4F7] text-[#17365D] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <strong className="text-[#202936] font-semibold">{t.task_name}</strong>
                        {t.customer_name && (
                          <span className="text-[#667085] text-[11px]">· Khách: {t.customer_name}</span>
                        )}
                        <span className="text-[10px] font-medium px-2 py-0.2 rounded bg-[#F2F4F7] text-[#344054]">
                          {TASK_STATUS_OPTIONS.find((s) => s.value === t.status)?.label || t.status}
                        </span>
                      </div>
                      {t.result_obstacle && (
                        <div className="text-[11px] text-[#667085] mt-1">{t.result_obstacle}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditOther(t)}
                      className="p-1 text-[#667085] hover:text-[#17365D] hover:bg-[#F2F4F7] rounded cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOther(t.id || t.task_name)}
                      className="p-1 text-[#667085] hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. DAILY SUMMARY (Visually secondary neutral section) */}
        <div className="bg-white border border-[#E4E7EC] rounded-lg p-3.5 sm:p-4 shadow-xs">
          <div
            className="flex items-center justify-between cursor-pointer sm:cursor-default"
            onClick={() => setIsMobileSummaryOpen((prev) => !prev)}
          >
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-[#202936]">
                  Tổng kết ngày & kế hoạch
                </h3>
                <span className="text-[11px] text-[#667085]">Tùy chọn</span>
              </div>
              {/* Mobile preview when collapsed */}
              {!isMobileSummaryOpen && (dailySummary || closedOrders !== undefined || contractValue) && (
                <p className="sm:hidden text-xs text-[#667085] truncate mt-1">
                  {dailySummary || `${closedOrders ? `${closedOrders} xe chốt` : ""} ${contractValue || ""}`}
                </p>
              )}
            </div>

            <button
              type="button"
              className="sm:hidden text-xs font-semibold text-[#17365D] p-1 cursor-pointer"
            >
              {isMobileSummaryOpen ? "Thu gọn" : dailySummary || closedOrders !== undefined || contractValue ? "Sửa" : "+ Thêm"}
            </button>
          </div>

          <div className={`${isMobileSummaryOpen ? "block" : "hidden sm:block"} space-y-3 pt-2.5`}>
            <textarea
              rows={2}
              value={dailySummary}
              onChange={(e) => {
                setDailySummary(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Kết quả chính, vướng mắc hoặc kế hoạch ngày mai…"
              className="w-full text-base sm:text-xs p-2.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17365D] focus:border-[#17365D]"
            />

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[#344054] text-xs font-medium">Đơn chốt trong ngày:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    value={closedOrders ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                      setClosedOrders(val);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="0"
                    className="w-16 h-8 text-base sm:text-xs font-semibold text-center bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D]"
                  />
                  <span className="text-[#667085] text-xs">xe</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#344054] text-xs font-medium shrink-0">Tổng giá trị HĐ:</span>
                <input
                  type="text"
                  value={contractValue}
                  onChange={(e) => {
                    setContractValue(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="VD: 350.000.000 đ"
                  className="w-full sm:w-40 h-8 text-base sm:text-xs px-2.5 bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Confirm Dialog */}
      {pendingSwitch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-lg shadow-xl border border-[#E4E7EC] max-w-sm w-full p-4 space-y-3">
            <h4 className="font-semibold text-[#202936] text-sm">Chưa lưu thay đổi</h4>
            <p className="text-xs text-[#667085] leading-relaxed">
              Bạn có các thay đổi chưa lưu trên báo cáo ngày {currentDate}. Bạn có muốn lưu trước khi chuyển không?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingSwitch(null)}
                className="h-8 px-3 text-xs font-medium text-[#344054] hover:bg-[#F2F4F7] rounded-md transition-colors cursor-pointer"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={discardAndSwitch}
                className="h-8 px-3 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
              >
                Bỏ thay đổi
              </button>
              <button
                type="button"
                onClick={confirmSaveAndSwitch}
                className="h-8 px-3.5 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#112B4B] rounded-md transition-colors shadow-xs cursor-pointer"
              >
                Lưu và tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Application Modal (replaces browser alert/confirm) */}
      <AppDialog
        isOpen={appDialog.isOpen}
        type={appDialog.type}
        title={appDialog.title}
        message={appDialog.message}
        confirmText={appDialog.confirmText}
        cancelText={appDialog.cancelText}
        isDestructive={appDialog.isDestructive}
        onConfirm={appDialog.onConfirm}
        onCancel={appDialog.onCancel}
      />

      {/* Export Preview Modal */}
      <WorkExcelPreviewModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleExportConfirm}
        currentStaff={currentStaff}
        availableStaff={staffList}
        canSelectMultiple={isManagerOrAdmin}
        currentDate={currentDate}
        currentReport={{
          staffId: selectedStaffId,
          staffName: currentStaff.full_name,
          branchName: currentStaff.branch_name || "Hatico",
          departmentName: currentStaff.department_name || "Kinh doanh",
          date: currentDate,
          calls,
          posts,
          otherTasks,
          visits,
          dailySummary,
          closedOrders,
          contractValue,
          status: "submitted",
        }}
        isExporting={isExporting}
      />
      {/* Mobile Bottom Floating Action Bar */}
      <div
        className={`sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E4E7EC] px-4 py-2.5 shadow-lg flex items-center justify-between gap-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] transition-transform duration-200 ${
          activeFormType ? "translate-y-full pointer-events-none" : "translate-y-0"
        }`}
      >
        <div className="min-w-0 flex items-center gap-2 text-xs">
          {isSaving ? (
            <span className="text-[#17365D] font-medium inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin text-[#17365D]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Đang lưu...
            </span>
          ) : hasUnsavedChanges ? (
            <span className="text-amber-700 font-medium inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Chưa lưu
            </span>
          ) : lastSavedAt ? (
            <span className="text-[#027A48] font-medium inline-flex items-center gap-1 truncate">
              <svg className="w-3.5 h-3.5 text-[#027A48]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Đã lưu {lastSavedAt}
            </span>
          ) : (
            <span className="text-[#667085]">Chưa có dữ liệu mới</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSaveReport}
          disabled={isSaving}
          className="h-10 px-4 text-xs font-semibold text-white bg-[#17365D] active:bg-[#112B4B] rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 touch-manipulation min-w-[120px] justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>Lưu báo cáo</span>
        </button>
      </div>
    </div>
  );
}

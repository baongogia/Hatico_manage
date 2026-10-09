import { createServiceClient } from "./supabase/service";
import {
  MarketingPeriodicReport,
  PeriodicReportType,
  PeriodicReportStatus,
  PeriodicEvaluation,
  PeriodicActionPlanItem,
  ReportHistoryItem,
} from "./periodic-marketing-types";
import {
  aggregatePeriodicReportData,
  getWeekDateRange,
  getMonthDateRange,
} from "./periodic-marketing-aggregator";
import { HATICO_BRANCHES } from "./marketing-types";

const LOCAL_STORAGE_KEY = "hatico_periodic_marketing_reports_v3";

let periodicTableExists: boolean | null = null;

async function checkPeriodicTable(supabase: ReturnType<typeof createServiceClient>): Promise<boolean> {
  if (periodicTableExists !== null) return periodicTableExists;
  try {
    const { error } = await supabase.from("marketing_periodic_reports").select("id").limit(1);
    periodicTableExists = !error;
    return periodicTableExists;
  } catch {
    periodicTableExists = false;
    return false;
  }
}

// ==============================================================================
// LOCAL STORAGE FALLBACK HELPERS
// ==============================================================================

function loadLocalReports(): MarketingPeriodicReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MarketingPeriodicReport[];
  } catch (err) {
    console.error("Error reading from local periodic storage:", err);
    return [];
  }
}

function saveLocalReports(reports: MarketingPeriodicReport[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error("Error saving to local periodic storage:", err);
  }
}

// ==============================================================================
// DATABASE CONVERTERS
// ==============================================================================

function toDbRow(rep: MarketingPeriodicReport) {
  return {
    id: rep.id,
    report_type: rep.reportType,
    year: rep.year,
    period_number: rep.periodNumber,
    branch_id: rep.branchId,
    branch_name: rep.branchName,
    start_date: rep.startDate,
    end_date: rep.endDate,
    creator_id: rep.creatorId || null,
    creator_name: rep.creatorName,
    status: rep.status,
    closed_at: rep.closedAt || null,
    closed_by: rep.closedBy || null,
    evaluation: rep.evaluation,
    action_plan: rep.actionPlan,
    snapshot: rep.data,
    history: rep.history,
    created_at: rep.createdAt,
    updated_at: rep.updatedAt,
  };
}

function fromDbRow(row: any): MarketingPeriodicReport {
  return {
    id: row.id,
    reportType: row.report_type as PeriodicReportType,
    year: row.year,
    periodNumber: row.period_number,
    branchId: row.branch_id || "all",
    branchName: row.branch_name || "Toàn hệ thống",
    startDate: row.start_date,
    endDate: row.end_date,
    creatorId: row.creator_id || undefined,
    creatorName: row.creator_name,
    status: row.status as PeriodicReportStatus,
    closedAt: row.closed_at || undefined,
    closedBy: row.closed_by || undefined,
    evaluation: row.evaluation || {
      highlightedResults: "",
      issuesAndDifficulties: "",
      proposalsAndRecommendations: "",
    },
    actionPlan: Array.isArray(row.action_plan) ? row.action_plan : [],
    data: row.snapshot,
    isSnapshot: row.status === "closed",
    lastAggregatedAt: row.updated_at || row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    history: Array.isArray(row.history) ? row.history : [],
  };
}

// ==============================================================================
// PUBLIC CRUD OPERATIONS
// ==============================================================================

export async function fetchPeriodicReports(
  reportType?: PeriodicReportType,
  year?: number,
  branchId?: string
): Promise<MarketingPeriodicReport[]> {
  try {
    const supabase = createServiceClient();
    const hasTable = await checkPeriodicTable(supabase);

    if (hasTable) {
      let query = supabase
        .from("marketing_periodic_reports")
        .select("*")
        .order("year", { ascending: false })
        .order("period_number", { ascending: false });

      if (reportType) query = query.eq("report_type", reportType);
      if (year) query = query.eq("year", year);
      if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);

      const { data, error } = await query;
      if (!error && data) {
        return data.map(fromDbRow);
      }
    }
  } catch (err) {
    console.warn("Falling back to local storage for periodic reports:", err);
  }

  // Fallback
  let local = loadLocalReports();
  if (reportType) local = local.filter((r) => r.reportType === reportType);
  if (year) local = local.filter((r) => r.year === year);
  if (branchId && branchId !== "all") local = local.filter((r) => r.branchId === branchId);

  return local.sort((a, b) => b.year - a.year || b.periodNumber - a.periodNumber);
}

export async function getPeriodicReportByPeriod(
  reportType: PeriodicReportType,
  periodNumber: number,
  year: number,
  branchId: string = "all"
): Promise<MarketingPeriodicReport | null> {
  try {
    const supabase = createServiceClient();
    const hasTable = await checkPeriodicTable(supabase);

    if (hasTable) {
      const { data, error } = await supabase
        .from("marketing_periodic_reports")
        .select("*")
        .eq("report_type", reportType)
        .eq("year", year)
        .eq("period_number", periodNumber)
        .eq("branch_id", branchId)
        .maybeSingle();

      if (!error && data) {
        return fromDbRow(data);
      }
    }
  } catch (err) {
    console.warn("Storage check fallback:", err);
  }

  const local = loadLocalReports();
  return (
    local.find(
      (r) =>
        r.reportType === reportType &&
        r.year === year &&
        r.periodNumber === periodNumber &&
        r.branchId === branchId
    ) || null
  );
}

export async function createOrGetPeriodicReport(
  reportType: PeriodicReportType,
  periodNumber: number,
  year: number,
  branchId: string = "all",
  creatorName: string = "Ngô Gia Bảo",
  creatorId?: string
): Promise<MarketingPeriodicReport> {
  // Check if official report already exists for this period & branch
  const existing = await getPeriodicReportByPeriod(reportType, periodNumber, year, branchId);
  if (existing) {
    return existing;
  }

  // Calculate dates
  const { startDate, endDate } =
    reportType === "weekly"
      ? getWeekDateRange(periodNumber, year)
      : getMonthDateRange(periodNumber, year);

  // Auto-aggregate live numbers from source marketing modules
  const aggregatedData = await aggregatePeriodicReportData(reportType, periodNumber, year, branchId);

  const branchMeta = HATICO_BRANCHES.find((b) => b.id === branchId);
  const branchName = branchId === "all" ? "Toàn hệ thống" : branchMeta ? branchMeta.name : "Toàn hệ thống";

  const now = new Date().toISOString();
  const newReport: MarketingPeriodicReport = {
    id: crypto.randomUUID(),
    reportType,
    year,
    periodNumber,
    branchId,
    branchName,
    startDate,
    endDate,
    creatorId,
    creatorName,
    status: "draft",
    evaluation: {
      highlightedResults: "",
      issuesAndDifficulties: "",
      proposalsAndRecommendations: "",
    },
    actionPlan: [
      {
        id: crypto.randomUUID(),
        task: "Sản xuất video ngắn giới thiệu sơ mi rơ mooc mới",
        target: "Đạt tối thiểu 5.000 lượt xem trên TikTok & Reels",
        assignee: "Phòng Marketing",
        deadline: endDate,
      },
      {
        id: crypto.randomUUID(),
        task: "Tối ưu chi phí chiến dịch Facebook Ads các tỉnh miền Nam",
        target: "Giảm CPL dưới 120.000đ/khách quan tâm",
        assignee: "Phụ trách Ads",
        deadline: endDate,
      },
    ],
    data: aggregatedData,
    isSnapshot: false,
    lastAggregatedAt: now,
    createdAt: now,
    updatedAt: now,
    history: [
      {
        timestamp: now,
        action: "created",
        userName: creatorName,
        notes: `Tạo mới bản nháp ${reportType === "weekly" ? `Tuần ${periodNumber}` : `Tháng ${periodNumber}`} / ${year}`,
      },
    ],
  };

  // Persist
  try {
    const supabase = createServiceClient();
    const hasTable = await checkPeriodicTable(supabase);
    if (hasTable) {
      await supabase.from("marketing_periodic_reports").upsert(toDbRow(newReport));
    }
  } catch (err) {
    console.error("Error creating report in DB:", err);
  }

  const local = loadLocalReports();
  local.unshift(newReport);
  saveLocalReports(local);

  return newReport;
}

export async function savePeriodicReportDraft(
  report: MarketingPeriodicReport,
  userName: string
): Promise<MarketingPeriodicReport> {
  const now = new Date().toISOString();

  // If draft, optionally update data with latest source
  const updated: MarketingPeriodicReport = {
    ...report,
    updatedAt: now,
    history: [
      ...report.history,
      {
        timestamp: now,
        action: "updated",
        userName,
        notes: "Lưu bản nháp đánh giá & kế hoạch",
      },
    ],
  };

  try {
    const supabase = createServiceClient();
    const hasTable = await checkPeriodicTable(supabase);
    if (hasTable) {
      await supabase.from("marketing_periodic_reports").upsert(toDbRow(updated));
    }
  } catch (err) {
    console.error("Error saving draft in DB:", err);
  }

  const local = loadLocalReports();
  const idx = local.findIndex((r) => r.id === report.id);
  if (idx >= 0) {
    local[idx] = updated;
  } else {
    local.unshift(updated);
  }
  saveLocalReports(local);

  return updated;
}

export async function refreshPeriodicReportData(
  reportId: string,
  userName: string
): Promise<MarketingPeriodicReport> {
  const reports = await fetchPeriodicReports();
  const target = reports.find((r) => r.id === reportId);
  if (!target) throw new Error("Không tìm thấy báo cáo!");

  if (target.status === "closed") {
    throw new Error("Báo cáo đã chốt không được cập nhật số liệu!");
  }

  const now = new Date().toISOString();
  const refreshedData = await aggregatePeriodicReportData(
    target.reportType,
    target.periodNumber,
    target.year,
    target.branchId
  );

  const updated: MarketingPeriodicReport = {
    ...target,
    data: refreshedData,
    lastAggregatedAt: now,
    updatedAt: now,
    history: [
      ...target.history,
      {
        timestamp: now,
        action: "updated",
        userName,
        notes: "Cập nhật số liệu tự động từ các module nguồn",
      },
    ],
  };

  try {
    const supabase = createServiceClient();
    const hasTable = await checkPeriodicTable(supabase);
    if (hasTable) {
      await supabase.from("marketing_periodic_reports").upsert(toDbRow(updated));
    }
  } catch (err) {
    console.error("Error refreshing report in DB:", err);
  }

  const local = loadLocalReports();
  const idx = local.findIndex((r) => r.id === reportId);
  if (idx >= 0) {
    local[idx] = updated;
  } else {
    local.unshift(updated);
  }
  saveLocalReports(local);

  return updated;
}

export async function closePeriodicReport(
  reportId: string,
  userName: string
): Promise<MarketingPeriodicReport> {
  const reports = await fetchPeriodicReports();
  const target = reports.find((r) => r.id === reportId);
  if (!target) throw new Error("Không tìm thấy báo cáo!");

  const now = new Date().toISOString();

  // Snapshot live data at the moment of closing
  const snapshotData = await aggregatePeriodicReportData(
    target.reportType,
    target.periodNumber,
    target.year,
    target.branchId
  );

  const updated: MarketingPeriodicReport = {
    ...target,
    status: "closed",
    closedAt: now,
    closedBy: userName,
    data: snapshotData,
    isSnapshot: true,
    updatedAt: now,
    history: [
      ...target.history,
      {
        timestamp: now,
        action: "closed",
        userName,
        notes: "Chốt báo cáo chính thức và lưu snapshot số liệu",
      },
    ],
  };

  try {
    const supabase = createServiceClient();
    const hasTable = await checkPeriodicTable(supabase);
    if (hasTable) {
      await supabase.from("marketing_periodic_reports").upsert(toDbRow(updated));
    }
  } catch (err) {
    console.error("Error closing report in DB:", err);
  }

  const local = loadLocalReports();
  const idx = local.findIndex((r) => r.id === reportId);
  if (idx >= 0) {
    local[idx] = updated;
  } else {
    local.unshift(updated);
  }
  saveLocalReports(local);

  return updated;
}

export async function reopenPeriodicReport(
  reportId: string,
  userName: string,
  notes?: string
): Promise<MarketingPeriodicReport> {
  const reports = await fetchPeriodicReports();
  const target = reports.find((r) => r.id === reportId);
  if (!target) throw new Error("Không tìm thấy báo cáo!");

  const now = new Date().toISOString();

  const updated: MarketingPeriodicReport = {
    ...target,
    status: "draft",
    closedAt: undefined,
    closedBy: undefined,
    updatedAt: now,
    history: [
      ...target.history,
      {
        timestamp: now,
        action: "reopened",
        userName,
        notes: notes || "Mở lại báo cáo để chỉnh sửa bổ sung",
      },
    ],
  };

  try {
    const supabase = createServiceClient();
    const hasTable = await checkPeriodicTable(supabase);
    if (hasTable) {
      await supabase.from("marketing_periodic_reports").upsert(toDbRow(updated));
    }
  } catch (err) {
    console.error("Error reopening report in DB:", err);
  }

  const local = loadLocalReports();
  const idx = local.findIndex((r) => r.id === reportId);
  if (idx >= 0) {
    local[idx] = updated;
  }
  saveLocalReports(local);

  return updated;
}

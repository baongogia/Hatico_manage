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

// In-memory server cache to guarantee immediate consistency across server actions & tests
const serverReportsCache = new Map<string, MarketingPeriodicReport>();

async function loadFallbackDailyReports(
  supabase: ReturnType<typeof createServiceClient>
): Promise<MarketingPeriodicReport[]> {
  try {
    const { data: reports } = await supabase.from("daily_reports").select("tasks_data");
    const list: MarketingPeriodicReport[] = [];
    for (const r of reports || []) {
      const tasks = Array.isArray(r.tasks_data) ? r.tasks_data : [];
      for (const t of tasks) {
        if (t.type === "marketing_periodic_report_record" && t.report) {
          const rep = t.report as MarketingPeriodicReport;
          list.push(rep);
          serverReportsCache.set(rep.id, rep);
        }
      }
    }
    for (const [id, rep] of serverReportsCache.entries()) {
      if (!list.some((r) => r.id === id)) {
        list.push(rep);
      }
    }
    return list;
  } catch (err) {
    return Array.from(serverReportsCache.values());
  }
}

async function saveFallbackDailyReport(
  supabase: ReturnType<typeof createServiceClient>,
  report: MarketingPeriodicReport
): Promise<void> {
  serverReportsCache.set(report.id, report);
  const date = report.startDate || new Date().toISOString().slice(0, 10);
  try {
    let { data: dr } = await supabase
      .from("daily_reports")
      .select("id, tasks_data")
      .eq("report_date", date)
      .limit(1)
      .maybeSingle();

    if (!dr) {
      const { data: fallbackUser } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
      const userId = fallbackUser?.id || "ae5c2a8c-738a-4831-b36a-0d6c000d64af";
      const { data: newDr } = await supabase
        .from("daily_reports")
        .insert({
          user_id: userId,
          report_date: date,
          tasks_data: [],
          status: "submitted",
        })
        .select("id, tasks_data")
        .single();
      dr = newDr;
    }

    if (dr) {
      const tasks: any[] = Array.isArray(dr.tasks_data) ? [...dr.tasks_data] : [];
      const idx = tasks.findIndex((t) => t.type === "marketing_periodic_report_record" && t.report?.id === report.id);
      const entry = { type: "marketing_periodic_report_record", report };
      if (idx >= 0) tasks[idx] = entry;
      else tasks.push(entry);
      await supabase
        .from("daily_reports")
        .update({ tasks_data: tasks, updated_at: new Date().toISOString() })
        .eq("id", dr.id);
    }
  } catch (err) {
    console.error("Error saving fallback periodic report:", err);
  }
}

async function removeFallbackDailyReport(
  supabase: ReturnType<typeof createServiceClient>,
  reportId: string
): Promise<void> {
  serverReportsCache.delete(reportId);
  try {
    const { data: reports } = await supabase.from("daily_reports").select("id, tasks_data");
    for (const r of reports || []) {
      if (!Array.isArray(r.tasks_data)) continue;
      const filtered = r.tasks_data.filter(
        (t: any) => !(t.type === "marketing_periodic_report_record" && t.report?.id === reportId)
      );
      if (filtered.length !== r.tasks_data.length) {
        await supabase
          .from("daily_reports")
          .update({ tasks_data: filtered, updated_at: new Date().toISOString() })
          .eq("id", r.id);
      }
    }
  } catch (err) {
    console.error("Error removing fallback periodic report:", err);
  }
}

function loadLocalReports(): MarketingPeriodicReport[] {
  if (typeof window === "undefined") {
    return Array.from(serverReportsCache.values());
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return Array.from(serverReportsCache.values());
    return JSON.parse(raw) as MarketingPeriodicReport[];
  } catch (err) {
    console.error("Error reading from local periodic storage:", err);
    return Array.from(serverReportsCache.values());
  }
}

function saveLocalReports(reports: MarketingPeriodicReport[]): void {
  for (const r of reports) {
    serverReportsCache.set(r.id, r);
  }
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

const isValidUuid = (id?: string) =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));

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
    creator_id: isValidUuid(rep.creatorId) ? rep.creatorId : null,
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
    console.warn("Falling back to daily_reports storage for periodic reports:", err);
  }

  // Fallback to daily_reports and in-memory cache
  const fallbackSupabase = createServiceClient();
  const fallbackList = await loadFallbackDailyReports(fallbackSupabase);
  let local = fallbackList.length > 0 ? fallbackList : loadLocalReports();
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

  const fallbackSupabase = createServiceClient();
  const fallbackList = await loadFallbackDailyReports(fallbackSupabase);
  const local = fallbackList.length > 0 ? fallbackList : loadLocalReports();
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
    } else {
      await saveFallbackDailyReport(supabase, newReport);
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
    } else {
      await saveFallbackDailyReport(supabase, updated);
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
  let target = reports.find((r) => r.id === reportId);
  if (!target) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase.from("marketing_periodic_reports").select("*").eq("id", reportId).maybeSingle();
      if (data) target = fromDbRow(data);
    } catch {}
  }
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
    } else {
      await saveFallbackDailyReport(supabase, updated);
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
  let target = reports.find((r) => r.id === reportId);
  if (!target) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase.from("marketing_periodic_reports").select("*").eq("id", reportId).maybeSingle();
      if (data) target = fromDbRow(data);
    } catch {}
  }
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
    } else {
      await saveFallbackDailyReport(supabase, updated);
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

export async function deletePeriodicReport(reportId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const hasTable = await checkPeriodicTable(supabase);
    if (hasTable) {
      await supabase.from("marketing_periodic_reports").delete().eq("id", reportId);
    } else {
      await removeFallbackDailyReport(supabase, reportId);
    }
  } catch (err) {
    console.error("Error deleting report from DB:", err);
  }

  const local = loadLocalReports();
  const filtered = local.filter((r) => r.id !== reportId);
  saveLocalReports(filtered);

  return true;
}


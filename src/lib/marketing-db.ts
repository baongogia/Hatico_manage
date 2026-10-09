import { createServiceClient } from "./supabase/service";
import {
  MarketingContentItem,
  MarketingCampaignItem,
  MarketingLeadItem,
  MarketingFilter,
  ExecutiveKPISummary,
  TrendDataPoint,
  ChannelComparisonPoint,
  AdPerformancePoint,
  BranchPerformanceRow,
  HATICO_BRANCHES,
  MarketingPlatform,
  AdPlatform,
} from "./marketing-types";

// ==============================================================================
// DATE RANGE UTILITIES
// ==============================================================================

export function getDateRangeBounds(filter: MarketingFilter): {
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
} {
  const now = new Date();
  const formatISO = (d: Date) => d.toISOString().split("T")[0];

  let start: Date;
  let end: Date = new Date(now);

  if (filter.dateRange === "today") {
    start = new Date(now);
  } else if (filter.dateRange === "7days") {
    start = new Date(now);
    start.setDate(start.getDate() - 6);
  } else if (filter.dateRange === "this_month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (filter.dateRange === "last_month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (filter.dateRange === "custom" && filter.startDate) {
    start = new Date(filter.startDate);
    end = filter.endDate ? new Date(filter.endDate) : new Date(now);
  } else {
    // Default to this month
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const startDate = formatISO(start);
  const endDate = formatISO(end);

  // Compute duration in days to calculate previous comparative period
  const diffTime = Math.max(0, end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays + 1);

  return {
    startDate,
    endDate,
    prevStartDate: formatISO(prevStart),
    prevEndDate: formatISO(prevEnd),
  };
}

// ==============================================================================
// DATA ACCESS LAYER: DEDICATED TABLES WITH FALLBACK TO SUPABASE DAILY_REPORTS
// ==============================================================================

let dedicatedTablesExist: boolean | null = null;

async function checkDedicatedTables(supabase: ReturnType<typeof createServiceClient>): Promise<boolean> {
  if (dedicatedTablesExist !== null) return dedicatedTablesExist;
  try {
    const { error } = await supabase.from("marketing_contents").select("id").limit(1);
    dedicatedTablesExist = !error;
    return dedicatedTablesExist;
  } catch {
    dedicatedTablesExist = false;
    return false;
  }
}

// Fallback storage key type inside daily_reports.tasks_data
interface MktContentDailyTask {
  type: "marketing_content_record";
  content: MarketingContentItem;
}
interface MktCampaignDailyTask {
  type: "marketing_campaign_record";
  campaign: MarketingCampaignItem;
}
interface MktLeadDailyTask {
  type: "marketing_lead_record";
  lead: MarketingLeadItem;
}

// ------------------------------------------------------------------------------
// MARKETING CONTENTS CRUD
// ------------------------------------------------------------------------------

export async function fetchMarketingContents(
  platform?: MarketingPlatform,
  branchId?: string,
  startDate?: string,
  endDate?: string
): Promise<MarketingContentItem[]> {
  const supabase = createServiceClient();
  const hasDedicated = await checkDedicatedTables(supabase);

  if (hasDedicated) {
    let query = supabase.from("marketing_contents").select("*").order("publish_date", { ascending: false });
    if (platform) query = query.eq("platform", platform);
    if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);
    if (startDate) query = query.gte("publish_date", startDate);
    if (endDate) query = query.lte("publish_date", endDate);

    const { data, error } = await query;
    if (!error && data) return data as MarketingContentItem[];
  }

  // Fallback: Read from daily_reports
  let fbQuery = supabase
    .from("daily_reports")
    .select("tasks_data, report_date")
    .order("report_date", { ascending: false });

  if (startDate) fbQuery = fbQuery.gte("report_date", startDate);
  if (endDate) fbQuery = fbQuery.lte("report_date", endDate);
  else fbQuery = fbQuery.limit(500);

  const { data: reports } = await fbQuery;

  const list: MarketingContentItem[] = [];
  for (const r of reports || []) {
    const tasks = Array.isArray(r.tasks_data) ? r.tasks_data : [];
    for (const t of tasks) {
      if (t.type === "marketing_content_record" && t.content) {
        const item: MarketingContentItem = t.content;
        if (platform && item.platform !== platform) continue;
        if (branchId && branchId !== "all" && item.branch_id !== branchId) continue;
        if (startDate && item.publish_date < startDate) continue;
        if (endDate && item.publish_date > endDate) continue;
        list.push(item);
      }
    }
  }

  return list.sort((a, b) => b.publish_date.localeCompare(a.publish_date));
}

export async function upsertMarketingContent(item: MarketingContentItem, userId: string): Promise<MarketingContentItem> {
  const supabase = createServiceClient();
  const hasDedicated = await checkDedicatedTables(supabase);
  const now = new Date().toISOString();

  const record: MarketingContentItem = {
    ...item,
    id: item.id || crypto.randomUUID(),
    author_id: item.author_id || userId,
    updated_at: now,
    created_at: item.created_at || now,
  };

  if (hasDedicated) {
    const { error } = await supabase.from("marketing_contents").upsert(record);
    if (!error) return record;
  }

  // Fallback: Store inside daily_reports for the publish_date
  await storeDailyReportTaskRecord(
    supabase,
    userId,
    record.publish_date,
    "marketing_content_record",
    record.id,
    record
  );

  return record;
}

export async function deleteMarketingContentById(id: string, userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const hasDedicated = await checkDedicatedTables(supabase);

  if (hasDedicated) {
    const { error } = await supabase.from("marketing_contents").delete().eq("id", id);
    if (!error) return true;
  }

  // Fallback
  await removeDailyReportTaskRecord(supabase, "marketing_content_record", id);
  return true;
}

// ------------------------------------------------------------------------------
// MARKETING CAMPAIGNS CRUD
// ------------------------------------------------------------------------------

export async function fetchMarketingCampaigns(
  platform?: AdPlatform,
  branchId?: string,
  startDate?: string,
  endDate?: string
): Promise<MarketingCampaignItem[]> {
  const supabase = createServiceClient();
  const hasDedicated = await checkDedicatedTables(supabase);

  if (hasDedicated) {
    let query = supabase.from("marketing_campaigns").select("*").order("start_date", { ascending: false });
    if (platform) query = query.eq("platform", platform);
    if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);
    if (startDate) query = query.gte("start_date", startDate);
    if (endDate) query = query.lte("start_date", endDate);

    const { data, error } = await query;
    if (!error && data) return data as MarketingCampaignItem[];
  }

  // Fallback
  let fbQuery = supabase
    .from("daily_reports")
    .select("tasks_data, report_date")
    .order("report_date", { ascending: false });

  if (startDate) fbQuery = fbQuery.gte("report_date", startDate);
  if (endDate) fbQuery = fbQuery.lte("report_date", endDate);
  else fbQuery = fbQuery.limit(500);

  const { data: reports } = await fbQuery;

  const list: MarketingCampaignItem[] = [];
  for (const r of reports || []) {
    const tasks = Array.isArray(r.tasks_data) ? r.tasks_data : [];
    for (const t of tasks) {
      if (t.type === "marketing_campaign_record" && t.campaign) {
        const item: MarketingCampaignItem = t.campaign;
        if (platform && item.platform !== platform) continue;
        if (branchId && branchId !== "all" && item.branch_id !== branchId) continue;
        if (startDate && item.start_date < startDate) continue;
        if (endDate && item.start_date > endDate) continue;
        list.push(item);
      }
    }
  }

  return list.sort((a, b) => b.start_date.localeCompare(a.start_date));
}

export async function upsertMarketingCampaign(item: MarketingCampaignItem, userId: string): Promise<MarketingCampaignItem> {
  const supabase = createServiceClient();
  const hasDedicated = await checkDedicatedTables(supabase);
  const now = new Date().toISOString();

  const record: MarketingCampaignItem = {
    ...item,
    id: item.id || crypto.randomUUID(),
    created_by: item.created_by || userId,
    updated_at: now,
    created_at: item.created_at || now,
  };

  if (hasDedicated) {
    const { error } = await supabase.from("marketing_campaigns").upsert(record);
    if (!error) return record;
  }

  // Fallback
  await storeDailyReportTaskRecord(
    supabase,
    userId,
    record.start_date,
    "marketing_campaign_record",
    record.id,
    record
  );

  return record;
}

export async function deleteMarketingCampaignById(id: string, userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const hasDedicated = await checkDedicatedTables(supabase);

  if (hasDedicated) {
    const { error } = await supabase.from("marketing_campaigns").delete().eq("id", id);
    if (!error) return true;
  }

  await removeDailyReportTaskRecord(supabase, "marketing_campaign_record", id);
  return true;
}

// ------------------------------------------------------------------------------
// MARKETING LEADS CRUD
// ------------------------------------------------------------------------------

export async function fetchMarketingLeads(
  source?: string,
  branchId?: string,
  startDate?: string,
  endDate?: string,
  search?: string
): Promise<MarketingLeadItem[]> {
  const supabase = createServiceClient();
  const hasDedicated = await checkDedicatedTables(supabase);

  if (hasDedicated) {
    let query = supabase.from("marketing_leads").select("*").order("lead_date", { ascending: false });
    if (source && source !== "all") query = query.eq("source", source);
    if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);
    if (startDate) query = query.gte("lead_date", startDate);
    if (endDate) query = query.lte("lead_date", endDate);
    if (search) {
      query = query.or(`phone.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (!error && data) return data as MarketingLeadItem[];
  }

  // Fallback
  let fbQuery = supabase
    .from("daily_reports")
    .select("tasks_data, report_date")
    .order("report_date", { ascending: false });

  if (startDate) fbQuery = fbQuery.gte("report_date", startDate);
  if (endDate) fbQuery = fbQuery.lte("report_date", endDate);
  else fbQuery = fbQuery.limit(500);

  const { data: reports } = await fbQuery;

  const list: MarketingLeadItem[] = [];
  for (const r of reports || []) {
    const tasks = Array.isArray(r.tasks_data) ? r.tasks_data : [];
    for (const t of tasks) {
      if (t.type === "marketing_lead_record" && t.lead) {
        const item: MarketingLeadItem = t.lead;
        if (source && source !== "all" && item.source !== source) continue;
        if (branchId && branchId !== "all" && item.branch_id !== branchId) continue;
        if (startDate && item.lead_date < startDate) continue;
        if (endDate && item.lead_date > endDate) continue;
        if (search) {
          const s = search.toLowerCase();
          const match = item.phone.toLowerCase().includes(s) || item.full_name.toLowerCase().includes(s);
          if (!match) continue;
        }
        list.push(item);
      }
    }
  }

  return list.sort((a, b) => b.lead_date.localeCompare(a.lead_date));
}

export async function upsertMarketingLead(item: MarketingLeadItem, userId: string): Promise<MarketingLeadItem> {
  const supabase = createServiceClient();
  const hasDedicated = await checkDedicatedTables(supabase);
  const now = new Date().toISOString();

  const record: MarketingLeadItem = {
    ...item,
    id: item.id || crypto.randomUUID(),
    created_by: item.created_by || userId,
    updated_at: now,
    created_at: item.created_at || now,
  };

  if (hasDedicated) {
    const { error } = await supabase.from("marketing_leads").upsert(record);
    if (!error) return record;
  }

  // Fallback
  await storeDailyReportTaskRecord(
    supabase,
    userId,
    record.lead_date,
    "marketing_lead_record",
    record.id,
    record
  );

  return record;
}

export async function deleteMarketingLeadById(id: string): Promise<boolean> {
  const supabase = createServiceClient();
  const hasDedicated = await checkDedicatedTables(supabase);

  if (hasDedicated) {
    const { error } = await supabase.from("marketing_leads").delete().eq("id", id);
    if (!error) return true;
  }

  await removeDailyReportTaskRecord(supabase, "marketing_lead_record", id);
  return true;
}

export async function checkPhoneDuplicate(phone: string, currentLeadId?: string): Promise<MarketingLeadItem | null> {
  const clean = phone.replace(/\D/g, "");
  if (!clean || clean.length < 9) return null;

  const leads = await fetchMarketingLeads();
  const found = leads.find((l) => {
    if (currentLeadId && l.id === currentLeadId) return false;
    const lClean = l.phone.replace(/\D/g, "");
    return lClean === clean;
  });

  return found || null;
}

// ------------------------------------------------------------------------------
// HELPERS FOR FALLBACK JSON STORAGE IN DAILY_REPORTS
// ------------------------------------------------------------------------------

const isValidUuid = (id?: string) =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));

async function storeDailyReportTaskRecord(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  date: string,
  recordType: "marketing_content_record" | "marketing_campaign_record" | "marketing_lead_record",
  recordId: string,
  recordData: any
) {
  let effectiveUserId = isValidUuid(userId) ? userId : null;
  if (!effectiveUserId) {
    const { data: fallbackUser } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
    effectiveUserId = fallbackUser?.id || "ae5c2a8c-738a-4831-b36a-0d6c000d64af";
  }

  // Find report for this date or user's report
  let { data: report } = await supabase
    .from("daily_reports")
    .select("id, tasks_data, user_id")
    .eq("report_date", date)
    .limit(1)
    .maybeSingle();

  if (!report) {
    const { data: newRep, error } = await supabase
      .from("daily_reports")
      .insert({
        user_id: effectiveUserId,
        report_date: date,
        tasks_data: [],
        status: "submitted",
      })
      .select("id, tasks_data, user_id")
      .single();

    if (error || !newRep) {
      console.error("Error creating daily_reports entry for marketing data:", error);
      return;
    }
    report = newRep;
  }

  if (!report) return;

  const tasks: any[] = Array.isArray(report.tasks_data) ? [...report.tasks_data] : [];
  const key = recordType === "marketing_content_record" ? "content" : recordType === "marketing_campaign_record" ? "campaign" : "lead";

  const existingIndex = tasks.findIndex((t) => t.type === recordType && t[key]?.id === recordId);
  const taskEntry = {
    type: recordType,
    [key]: recordData,
  };

  if (existingIndex >= 0) {
    tasks[existingIndex] = taskEntry;
  } else {
    tasks.push(taskEntry);
  }

  await supabase
    .from("daily_reports")
    .update({ tasks_data: tasks, updated_at: new Date().toISOString() })
    .eq("id", report.id);
}

async function removeDailyReportTaskRecord(
  supabase: ReturnType<typeof createServiceClient>,
  recordType: string,
  recordId: string
) {
  const { data: reports } = await supabase
    .from("daily_reports")
    .select("id, tasks_data");

  const key = recordType === "marketing_content_record" ? "content" : recordType === "marketing_campaign_record" ? "campaign" : "lead";

  for (const r of reports || []) {
    if (!Array.isArray(r.tasks_data)) continue;
    const filtered = r.tasks_data.filter((t: any) => !(t.type === recordType && t[key]?.id === recordId));
    if (filtered.length !== r.tasks_data.length) {
      await supabase
        .from("daily_reports")
        .update({ tasks_data: filtered, updated_at: new Date().toISOString() })
        .eq("id", r.id);
    }
  }
}

// ==============================================================================
// AGGREGATION & EXECUTIVE DASHBOARD CALCULATOR
// ==============================================================================

export async function calculateMarketingDashboardMetrics(filter: MarketingFilter): Promise<{
  kpis: ExecutiveKPISummary;
  trendData: TrendDataPoint[];
  channelComparison: ChannelComparisonPoint[];
  adPerformance: AdPerformancePoint[];
  branchPerformance: BranchPerformanceRow[];
}> {
  const { startDate, endDate, prevStartDate, prevEndDate } = getDateRangeBounds(filter);

  // 1. Fetch current and previous period contents
  const currentContents = await fetchMarketingContents(
    filter.channel && filter.channel !== "all" && filter.channel !== "ads" ? filter.channel : undefined,
    filter.branchId,
    startDate,
    endDate
  );
  const prevContents = await fetchMarketingContents(
    filter.channel && filter.channel !== "all" && filter.channel !== "ads" ? filter.channel : undefined,
    filter.branchId,
    prevStartDate,
    prevEndDate
  );

  // 2. Fetch current and previous period campaigns
  const currentCampaigns = await fetchMarketingCampaigns(
    undefined,
    filter.branchId,
    startDate,
    endDate
  );
  const prevCampaigns = await fetchMarketingCampaigns(
    undefined,
    filter.branchId,
    prevStartDate,
    prevEndDate
  );

  // 3. Fetch current and previous period leads (Single source of truth for leads & orders)
  const currentLeads = await fetchMarketingLeads(
    undefined,
    filter.branchId,
    startDate,
    endDate
  );
  const prevLeads = await fetchMarketingLeads(
    undefined,
    filter.branchId,
    prevStartDate,
    prevEndDate
  );

  // --- Aggregate Current Period ---
  const totalContents = currentContents.length;
  const totalViews = currentContents.reduce((s, c) => s + (Number(c.views) || 0), 0);
  const totalInteractions = currentContents.reduce((s, c) => s + (Number(c.interactions) || 0), 0);

  // Count leads accurately from currentLeads to avoid double-counting
  const totalLeads = currentLeads.length;
  const totalConsulted = currentLeads.filter(
    (l) => l.status === "consulted" || l.status === "discussing" || l.status === "converted" || l.status === "closed"
  ).length;
  const totalConverted = currentLeads.filter((l) => l.status === "converted" || l.status === "closed").length;
  const totalOrders = currentLeads.filter((l) => l.status === "closed").length;

  // Ad costs from campaigns
  const totalAdCost = currentCampaigns.reduce((s, c) => s + (Number(c.actual_cost) || 0), 0);

  // --- Aggregate Previous Period ---
  const prevTotalContents = prevContents.length;
  const prevTotalViews = prevContents.reduce((s, c) => s + (Number(c.views) || 0), 0);
  const prevTotalInteractions = prevContents.reduce((s, c) => s + (Number(c.interactions) || 0), 0);

  const prevTotalLeads = prevLeads.length;
  const prevTotalConsulted = prevLeads.filter(
    (l) => l.status === "consulted" || l.status === "discussing" || l.status === "converted" || l.status === "closed"
  ).length;
  const prevTotalConverted = prevLeads.filter((l) => l.status === "converted" || l.status === "closed").length;
  const prevTotalOrders = prevLeads.filter((l) => l.status === "closed").length;
  const prevTotalAdCost = prevCampaigns.reduce((s, c) => s + (Number(c.actual_cost) || 0), 0);

  // CPL & Cost Per Order: Safe calculation (null when denominator is 0)
  const adLeadsCount = currentLeads.filter((l) => l.source === "facebook_ads" || l.source === "tiktok_ads").length;
  const adOrdersCount = currentLeads.filter((l) => (l.source === "facebook_ads" || l.source === "tiktok_ads") && l.status === "closed").length;

  const cpl = adLeadsCount > 0 ? Math.round(totalAdCost / adLeadsCount) : null;
  const costPerOrder = adOrdersCount > 0 ? Math.round(totalAdCost / adOrdersCount) : null;

  const kpis: ExecutiveKPISummary = {
    totalContents,
    totalViews,
    totalInteractions,
    totalLeads,
    totalConsulted,
    totalConverted,
    totalOrders,
    totalAdCost,

    prevTotalContents,
    prevTotalViews,
    prevTotalInteractions,
    prevTotalLeads,
    prevTotalConsulted,
    prevTotalConverted,
    prevTotalOrders,
    prevTotalAdCost,

    cpl,
    costPerOrder,
  };

  // --- Chart 1: Trend Data (Grouped by date within range) ---
  const dateMap = new Map<string, { leads: number; consulted: number; orders: number }>();
  // Prepopulate dates
  const cur = new Date(startDate);
  const endD = new Date(endDate);
  while (cur <= endD) {
    const dStr = cur.toISOString().split("T")[0];
    dateMap.set(dStr, { leads: 0, consulted: 0, orders: 0 });
    cur.setDate(cur.getDate() + 1);
  }

  for (const l of currentLeads) {
    const dStr = l.lead_date;
    const entry = dateMap.get(dStr) || { leads: 0, consulted: 0, orders: 0 };
    entry.leads += 1;
    if (l.status === "consulted" || l.status === "discussing" || l.status === "converted" || l.status === "closed") {
      entry.consulted += 1;
    }
    if (l.status === "closed") {
      entry.orders += 1;
    }
    dateMap.set(dStr, entry);
  }

  const trendData: TrendDataPoint[] = Array.from(dateMap.entries()).map(([d, val]) => {
    const parts = d.split("-");
    return {
      date: d,
      displayDate: `${parts[2]}/${parts[1]}`,
      leads: val.leads,
      consulted: val.consulted,
      orders: val.orders,
    };
  });

  // --- Chart 2: Channel Comparison (Facebook, TikTok, YouTube, Website) ---
  const channels = ["Facebook", "TikTok", "YouTube", "Website"];
  const channelComparison: ChannelComparisonPoint[] = channels.map((chName) => {
    const chLower = chName.toLowerCase();
    const contents = currentContents.filter((c) => c.platform === chLower);
    const leads = currentLeads.filter(
      (l) => l.source === `${chLower}_organic` || (chLower === "facebook" && l.source === "facebook_ads") || (chLower === "tiktok" && l.source === "tiktok_ads") || l.source === chLower
    );
    const orders = leads.filter((l) => l.status === "closed").length;
    const views = contents.reduce((s, c) => s + (Number(c.views) || 0), 0);
    const interactions = contents.reduce((s, c) => s + (Number(c.interactions) || 0), 0);

    return {
      channel: chName,
      leads: leads.length,
      orders,
      views,
      interactions,
    };
  });

  // --- Chart 3: Ad Performance (Facebook Ads vs TikTok Ads) ---
  const fbCampaigns = currentCampaigns.filter((c) => c.platform === "facebook_ads");
  const fbCost = fbCampaigns.reduce((s, c) => s + (Number(c.actual_cost) || 0), 0);
  const fbLeads = currentLeads.filter((l) => l.source === "facebook_ads");
  const fbOrders = fbLeads.filter((l) => l.status === "closed").length;

  const ttCampaigns = currentCampaigns.filter((c) => c.platform === "tiktok_ads");
  const ttCost = ttCampaigns.reduce((s, c) => s + (Number(c.actual_cost) || 0), 0);
  const ttLeads = currentLeads.filter((l) => l.source === "tiktok_ads");
  const ttOrders = ttLeads.filter((l) => l.status === "closed").length;

  const adPerformance: AdPerformancePoint[] = [
    {
      channel: "Facebook Ads",
      cost: fbCost,
      leads: fbLeads.length,
      orders: fbOrders,
      cpl: fbLeads.length > 0 ? Math.round(fbCost / fbLeads.length) : null,
    },
    {
      channel: "TikTok Ads",
      cost: ttCost,
      leads: ttLeads.length,
      orders: ttOrders,
      cpl: ttLeads.length > 0 ? Math.round(ttCost / ttLeads.length) : null,
    },
  ];

  // --- Branch Performance Table ---
  const branchPerformance: BranchPerformanceRow[] = HATICO_BRANCHES.map((b) => {
    const contents = currentContents.filter((c) => c.branch_id === b.id);
    const sourceLeads = currentLeads.filter((l) => l.branch_id === b.id);
    const consulted = sourceLeads.filter(
      (l) => l.status === "consulted" || l.status === "discussing" || l.status === "converted" || l.status === "closed"
    ).length;
    const converted = sourceLeads.filter((l) => l.status === "converted" || l.status === "closed").length;
    const orders = sourceLeads.filter((l) => l.status === "closed").length;
    const campaigns = currentCampaigns.filter((c) => c.branch_id === b.id);
    const adCost = campaigns.reduce((s, c) => s + (Number(c.actual_cost) || 0), 0);

    const handledLeads = currentLeads.filter((l) => l.handler_branch_id === b.id);
    const handledOrders = handledLeads.filter((l) => l.status === "closed").length;

    return {
      branchId: b.id,
      branchName: b.name,
      contentsCount: contents.length,
      leadsCount: sourceLeads.length,
      consultedCount: consulted,
      convertedCount: converted,
      ordersCount: orders,
      adCost,
      handledLeadsCount: handledLeads.length,
      handledOrdersCount: handledOrders,
    };
  });

  return {
    kpis,
    trendData,
    channelComparison,
    adPerformance,
    branchPerformance,
  };
}

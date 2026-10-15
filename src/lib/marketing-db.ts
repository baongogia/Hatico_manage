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

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getDateRangeBounds(filter: MarketingFilter): {
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
} {
  const now = new Date();

  let start: Date;
  let end: Date;
  let prevStart: Date;
  let prevEnd: Date;

  if (filter.dateRange === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  } else if (filter.dateRange === "7days") {
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
  } else if (filter.dateRange === "this_month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (filter.dateRange === "last_month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
  } else if (filter.dateRange === "custom" && filter.startDate) {
    const sParts = filter.startDate.split("-").map(Number);
    start = new Date(sParts[0], sParts[1] - 1, sParts[2]);
    if (filter.endDate) {
      const eParts = filter.endDate.split("-").map(Number);
      end = new Date(eParts[0], eParts[1] - 1, eParts[2]);
    } else {
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    prevEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
    prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - diffDays + 1);
  } else {
    // Default to this month
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  }

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
    prevStartDate: formatLocalDate(prevStart),
    prevEndDate: formatLocalDate(prevEnd),
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

// Platform & Content Normalization Helpers
export function normalizePlatform(raw?: string): MarketingPlatform {
  if (!raw) return "facebook";
  const s = raw.toLowerCase();
  if (s.includes("tiktok")) return "tiktok";
  if (s.includes("facebook")) return "facebook";
  if (s.includes("youtube")) return "youtube";
  if (s.includes("website")) return "website";
  return "facebook";
}

export function matchesPlatform(rawPlatform?: string, targetPlatform?: MarketingPlatform): boolean {
  if (!targetPlatform || (targetPlatform as string) === "all") return true;
  if (!rawPlatform) return false;
  const s = rawPlatform.toLowerCase();
  if (targetPlatform === "tiktok") return s.includes("tiktok");
  if (targetPlatform === "facebook") return s.includes("facebook");
  if (targetPlatform === "youtube") return s.includes("youtube");
  if (targetPlatform === "website") return s.includes("website");
  return false;
}

export function parseViewsCount(val: string | number | undefined | null): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim().toLowerCase();
  if (str === ">1k") return 1000;
  if (str === ">2k") return 2000;
  if (str.includes(">5k")) return 5000;
  if (str.includes(">10k") || str.includes("> 10k")) return 10000;
  if (str.endsWith("k")) {
    const n = parseFloat(str.replace("k", ""));
    return isNaN(n) ? 0 : Math.round(n * 1000);
  }
  const digits = str.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function guessContentType(link?: string, platform?: string, existing?: string): string {
  if (existing && existing.trim()) return existing.trim();
  const l = (link || "").toLowerCase();
  const p = (platform || "").toLowerCase();
  if (l.includes("/shorts/") || (p.includes("youtube") && !l.includes("watch"))) return "Shorts";
  if (l.includes("/reel/") || l.includes("reels")) return "Reels";
  if (p.includes("tiktok") || l.includes("tiktok.com")) return "Video ngắn";
  if (p.includes("website") || l.includes("mooc-hatico.com.vn") || l.includes("hatico.com")) return "Bài website";
  if (p.includes("youtube")) return "Video dài";
  return "Bài viết";
}

export function getStablePostId(reportId: string, date: string, title: string, link: string): string {
  const raw = `${reportId}::${date}::${(title || "").trim()}::${(link || "").trim()}`;
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function capitalizePlatform(p: string): string {
  if (p === "tiktok") return "Tiktok";
  if (p === "facebook") return "Facebook";
  if (p === "youtube") return "Youtube";
  if (p === "website") return "Website";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

// ------------------------------------------------------------------------------
// MARKETING CONTENTS CRUD (Single Source of Truth)
// ------------------------------------------------------------------------------

export async function fetchMarketingContents(
  platform?: MarketingPlatform,
  branchId?: string,
  startDate?: string,
  endDate?: string
): Promise<MarketingContentItem[]> {
  const supabase = createServiceClient();
  const hasDedicated = await checkDedicatedTables(supabase);

  // If dedicated table exists and has data, query it
  if (hasDedicated) {
    let query = supabase.from("marketing_contents").select("*").order("publish_date", { ascending: false });
    if (platform) query = query.eq("platform", platform);
    if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);
    if (startDate) query = query.gte("publish_date", startDate);
    if (endDate) query = query.lte("publish_date", endDate);

    const { data, error } = await query;
    if (!error && data && data.length > 0) return data as MarketingContentItem[];
  }

  // Load daily_reports containing both marketing_post and marketing_content_record
  // Also load profiles to get author names and default branches
  const [reportsRes, profilesRes] = await Promise.all([
    supabase
      .from("daily_reports")
      .select("id, tasks_data, report_date, user_id, created_at, updated_at")
      .order("report_date", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, department_id, departments(id, name, branch_id)")
  ]);

  interface ProfileWithDept {
    id: string;
    full_name: string;
    department_id: string | null;
    departments: { id: string; name: string; branch_id: string } | null;
  }
  const profileMap = new Map<string, ProfileWithDept>(
    ((profilesRes.data || []) as unknown as ProfileWithDept[]).map((p) => [p.id, p])
  );
  const list: MarketingContentItem[] = [];
  const seenIds = new Set<string>();

  for (const r of reportsRes.data || []) {
    const reportDate = r.report_date;
    const authorProfile = profileMap.get(r.user_id);
    const authorBranchId = authorProfile?.departments?.branch_id || HATICO_BRANCHES[0].id;
    const authorName = authorProfile?.full_name || "Nhân viên Marketing";

    const tasks = Array.isArray(r.tasks_data) ? r.tasks_data : [];
    for (const t of tasks) {
      // 1. Case A: "marketing_post" (centralized Post Reporting in daily_reports)
      if (t.type === "marketing_post") {
        const rawPlatform = t.platform || "Facebook";
        if (platform && !matchesPlatform(rawPlatform, platform)) continue;

        const effectiveBranchId = t.branch_id || authorBranchId;
        if (branchId && branchId !== "all" && effectiveBranchId !== branchId) continue;

        const itemDate = t.publish_date || reportDate;
        if (startDate && itemDate < startDate) continue;
        if (endDate && itemDate > endDate) continue;

        const stableId = t.id || getStablePostId(r.id, reportDate, t.title || "", t.link || "");
        if (seenIds.has(stableId)) continue;
        seenIds.add(stableId);

        const views = parseViewsCount(t.views);
        const likes = parseViewsCount(t.likes);
        const comments = parseViewsCount(t.comments);
        const shares = parseViewsCount(t.shares);
        const interactions = (Number(t.interactions) || 0) || (likes + comments + shares);

        const item: MarketingContentItem = {
          id: stableId,
          platform: normalizePlatform(rawPlatform),
          platform_raw: rawPlatform,
          platforms: rawPlatform.split(",").map((p: string) => p.trim().toLowerCase()).filter(Boolean),
          publish_date: t.publish_date || reportDate,
          title: (t.title || "").trim(),
          content_type: guessContentType(t.link, rawPlatform, t.content_type),
          topic: t.topic || "",
          link: t.link || "",
          views,
          interactions,
          likes,
          comments,
          shares,
          leads_count: Number(t.leads_count) || 0,
          consulted_count: Number(t.consulted_count) || 0,
          converted_count: Number(t.converted_count) || 0,
          orders_count: Number(t.orders_count) || 0,
          branch_id: effectiveBranchId,
          fanpage_name: t.fanpage_name || "",
          author_id: t.author_id || r.user_id,
          author_name: t.author_name || authorName,
          status: t.status || "completed",
          notes: t.notes || "",
          created_at: r.created_at,
          updated_at: r.updated_at,
        };
        list.push(item);
      }
      // 2. Case B: "marketing_content_record"
      else if (t.type === "marketing_content_record" && t.content) {
        const c: MarketingContentItem = t.content;
        const rawPlatform = c.platform_raw || c.platform;
        if (platform && !matchesPlatform(rawPlatform, platform)) continue;

        const effectiveBranchId = c.branch_id || authorBranchId;
        if (branchId && branchId !== "all" && effectiveBranchId !== branchId) continue;

        if (startDate && c.publish_date < startDate) continue;
        if (endDate && c.publish_date > endDate) continue;

        if (seenIds.has(c.id)) continue;
        seenIds.add(c.id);

        list.push({
          ...c,
          branch_id: effectiveBranchId,
          author_name: c.author_name || authorName,
        });
      }
    }
  }

  return list.sort((a, b) => b.publish_date.localeCompare(a.publish_date));
}

export async function upsertMarketingContent(item: MarketingContentItem, userId: string): Promise<MarketingContentItem> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const contentId = item.id || crypto.randomUUID();

  // Find author name if needed
  let authorName = item.author_name;
  if (!authorName && userId) {
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    authorName = prof?.full_name;
  }

  const record: MarketingContentItem = {
    ...item,
    id: contentId,
    author_id: item.author_id || userId,
    author_name: authorName,
    platform: item.platform || "facebook",
    platform_raw: item.platform_raw || capitalizePlatform(item.platform),
    views: Number(item.views) || 0,
    interactions: Number(item.interactions) || 0,
    updated_at: now,
    created_at: item.created_at || now,
  };

  const hasDedicated = await checkDedicatedTables(supabase);
  if (hasDedicated) {
    await supabase.from("marketing_contents").upsert(record);
  }

  // Unified persistence into daily_reports as marketing_post
  const { data: allReports } = await supabase
    .from("daily_reports")
    .select("id, report_date, tasks_data, user_id");

  let updatedExisting = false;
  for (const r of allReports || []) {
    if (!Array.isArray(r.tasks_data)) continue;
    let modified = false;
    const nextTasks = r.tasks_data.map((t: Record<string, unknown>) => {
      const isMatch =
        (t.type === "marketing_post" &&
          (t.id === record.id ||
            getStablePostId(r.id, r.report_date, String(t.title || ""), String(t.link || "")) === record.id)) ||
        (t.type === "marketing_content_record" && (t.content as MarketingContentItem)?.id === record.id);

      if (isMatch) {
        if (r.report_date === record.publish_date) {
          modified = true;
          updatedExisting = true;
          return {
            id: record.id,
            type: "marketing_post",
            platform: record.platform_raw || capitalizePlatform(record.platform),
            title: record.title,
            link: record.link || "",
            views: String(record.views),
            likes: String(record.likes ?? ""),
            comments: String(record.comments ?? ""),
            shares: String(record.shares ?? ""),
            status: record.status || "completed",
            content_type: record.content_type,
            topic: record.topic || "",
            branch_id: record.branch_id,
            author_id: record.author_id,
            author_name: record.author_name,
          };
        } else {
          // Date changed: drop from old date
          modified = true;
          return null;
        }
      }
      return t;
    }).filter(Boolean);

    if (modified) {
      await supabase.from("daily_reports").update({ tasks_data: nextTasks, updated_at: now }).eq("id", r.id);
    }
  }

  // If not updated in place, find or create daily_reports for record.publish_date
  if (!updatedExisting) {
    let { data: targetRep } = await supabase
      .from("daily_reports")
      .select("id, tasks_data")
      .eq("report_date", record.publish_date)
      .eq("user_id", record.author_id || userId)
      .limit(1)
      .maybeSingle();

    if (!targetRep) {
      const { data: anyRep } = await supabase
        .from("daily_reports")
        .select("id, tasks_data")
        .eq("report_date", record.publish_date)
        .limit(1)
        .maybeSingle();
      targetRep = anyRep;
    }

    if (!targetRep) {
      const { data: newRep } = await supabase
        .from("daily_reports")
        .insert({
          user_id: record.author_id || userId,
          report_date: record.publish_date,
          tasks_data: [],
          status: "submitted",
          created_at: now,
          updated_at: now,
        })
        .select("id, tasks_data")
        .single();
      targetRep = newRep;
    }

    if (targetRep) {
      const rawTasks = Array.isArray(targetRep.tasks_data) ? targetRep.tasks_data : [];
      const tasks = rawTasks.filter((t: Record<string, unknown>) => t.id !== record.id);
      const newTask = {
        id: record.id,
        type: "marketing_post",
        platform: record.platform_raw || capitalizePlatform(record.platform),
        title: record.title,
        link: record.link || "",
        views: String(record.views),
        likes: String(record.likes ?? ""),
        comments: String(record.comments ?? ""),
        shares: String(record.shares ?? ""),
        status: record.status || "completed",
        content_type: record.content_type,
        topic: record.topic || "",
        branch_id: record.branch_id,
        author_id: record.author_id,
        author_name: record.author_name,
      };
      tasks.push(newTask);
      await supabase.from("daily_reports").update({ tasks_data: tasks, updated_at: now }).eq("id", targetRep.id);
    }
  }

  return record;
}

export async function deleteMarketingContentById(id: string, _userId?: string): Promise<boolean> {
  const supabase = createServiceClient();
  const hasDedicated = await checkDedicatedTables(supabase);

  if (hasDedicated) {
    await supabase.from("marketing_contents").delete().eq("id", id);
  }

  // Remove from daily_reports
  const { data: allReports } = await supabase
    .from("daily_reports")
    .select("id, report_date, tasks_data")
    .order("report_date", { ascending: false })
    .limit(3000);

  for (const r of allReports || []) {
    if (!Array.isArray(r.tasks_data)) continue;
    const filtered = r.tasks_data.filter((t: Record<string, unknown>) => {
      if (t.type === "marketing_post") {
        const stableId = (t.id as string) || getStablePostId(r.id, r.report_date, String(t.title || ""), String(t.link || ""));
        return stableId !== id;
      }
      if (t.type === "marketing_content_record") {
        return (t.content as MarketingContentItem)?.id !== id;
      }
      return true;
    });

    if (filtered.length !== r.tasks_data.length) {
      await supabase
        .from("daily_reports")
        .update({ tasks_data: filtered, updated_at: new Date().toISOString() })
        .eq("id", r.id);
    }
  }

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
  const seenIds = new Set<string>();
  for (const r of reports || []) {
    const tasks = Array.isArray(r.tasks_data) ? r.tasks_data : [];
    for (const t of tasks) {
      if (t.type === "marketing_campaign_record" && t.campaign) {
        const item: MarketingCampaignItem = t.campaign;
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);
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
    record as unknown as Record<string, unknown>
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
  const seenIds = new Set<string>();
  for (const r of reports || []) {
    const tasks = Array.isArray(r.tasks_data) ? r.tasks_data : [];
    for (const t of tasks) {
      if (t.type === "marketing_lead_record" && t.lead) {
        const item: MarketingLeadItem = t.lead;
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);
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
  const today = now.slice(0, 10);

  let consultedAt = item.consulted_at;
  let convertedAt = item.converted_at;
  let closedAt = item.closed_at;

  if (["consulted", "discussing", "converted", "closed"].includes(item.status) && !consultedAt) {
    consultedAt = today;
  }
  if (["converted", "closed"].includes(item.status) && !convertedAt) {
    convertedAt = today;
  }
  if (item.status === "closed" && !closedAt) {
    closedAt = today;
  }

  const statusHistory = Array.isArray(item.status_history) ? [...item.status_history] : [];
  if (statusHistory.length === 0 || statusHistory[statusHistory.length - 1].status !== item.status) {
    statusHistory.push({
      status: item.status,
      changed_at: now,
      note: item.notes,
    });
  }

  const record: MarketingLeadItem = {
    ...item,
    id: item.id || crypto.randomUUID(),
    created_by: item.created_by || userId,
    consulted_at: consultedAt,
    converted_at: convertedAt,
    closed_at: closedAt,
    status_history: statusHistory,
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
    record as unknown as Record<string, unknown>
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
  recordData: Record<string, unknown>
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

  const tasks: Record<string, unknown>[] = Array.isArray(report.tasks_data)
    ? (report.tasks_data as Record<string, unknown>[])
    : [];
  const key = recordType === "marketing_content_record" ? "content" : recordType === "marketing_campaign_record" ? "campaign" : "lead";

  const existingIndex = tasks.findIndex((t) => t.type === recordType && (t[key] as { id?: string })?.id === recordId);
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
    .select("id, tasks_data")
    .order("report_date", { ascending: false })
    .limit(3000);

  const key = recordType === "marketing_content_record" ? "content" : recordType === "marketing_campaign_record" ? "campaign" : "lead";

  for (const r of reports || []) {
    if (!Array.isArray(r.tasks_data)) continue;
    const tasks = r.tasks_data as Record<string, unknown>[];
    const filtered = tasks.filter((t) => !(t.type === recordType && (t[key] as { id?: string })?.id === recordId));
    if (filtered.length !== tasks.length) {
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

  const countContentPlatformPosts = (items: typeof currentContents) => {
    return items.reduce((acc, c) => {
      let count = 0;
      const p = (c.platform_raw || c.platform || "").toLowerCase();
      if (p.includes("tiktok")) count++;
      if (p.includes("facebook")) count++;
      if (p.includes("youtube")) count++;
      if (p.includes("website")) count++;
      return acc + (count || 1);
    }, 0);
  };

  // --- Aggregate Current Period ---
  const totalContents = countContentPlatformPosts(currentContents);
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
  const prevTotalContents = countContentPlatformPosts(prevContents);
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
  const [sY, sM, sD] = startDate.split("-").map(Number);
  const [eY, eM, eD] = endDate.split("-").map(Number);
  const cur = new Date(sY, sM - 1, sD);
  const endD = new Date(eY, eM - 1, eD);
  while (cur <= endD) {
    const dStr = formatLocalDate(cur);
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
    const chLower = chName.toLowerCase() as MarketingPlatform;
    const contents = currentContents.filter((c) => matchesPlatform(c.platform_raw || c.platform, chLower));
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

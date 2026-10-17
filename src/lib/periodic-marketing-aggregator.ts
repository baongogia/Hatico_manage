import {
  PeriodicReportType,
  PeriodicReportKPIs,
  KPICardComparison,
  ChannelResultRow,
  TopContentItem,
  AdPlatformReport,
  AdComparisonSummary,
  BranchResultRow,
  PeriodicReportDataSnapshot,
} from "./periodic-marketing-types";
import {
  fetchMarketingContents,
  fetchMarketingCampaigns,
  fetchMarketingLeads,
  matchesPlatform,
} from "./marketing-db";
import { HATICO_BRANCHES } from "./marketing-types";

// ==============================================================================
// DATE RANGE CALCULATION HELPERS
// ==============================================================================

export function getWeekDateRange(weekNumber: number, year: number): { startDate: string; endDate: string } {
  // ISO-8601 week 1 is the week with the year's first Thursday (Jan 4 is always in week 1)
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay(); // 0 is Sunday, 1 is Monday...
  const mondayOffset = (dayOfWeek + 6) % 7; // Days from Monday of Week 1
  const week1Monday = new Date(Date.UTC(year, 0, 4 - mondayOffset));

  const start = new Date(week1Monday.getTime() + (weekNumber - 1) * 7 * 86400000);
  const end = new Date(start.getTime() + 6 * 86400000);
  const formatISO = (d: Date) => d.toISOString().split("T")[0];
  return { startDate: formatISO(start), endDate: formatISO(end) };
}

export function getMultiWeekDateRange(
  startWeek: number,
  endWeek: number,
  year: number
): { startDate: string; endDate: string } {
  const { startDate } = getWeekDateRange(startWeek, year);
  const { endDate } = getWeekDateRange(endWeek, year);
  return { startDate, endDate };
}

export function getMonthDateRange(month: number, year: number): { startDate: string; endDate: string } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const formatISO = (d: Date) => d.toISOString().split("T")[0];
  return { startDate: formatISO(start), endDate: formatISO(end) };
}

export function getPreviousPeriod(
  type: PeriodicReportType,
  periodNumber: number,
  year: number
): { prevPeriodNumber: number; prevYear: number } {
  if (type === "weekly") {
    if (periodNumber > 1) {
      return { prevPeriodNumber: periodNumber - 1, prevYear: year };
    }
    return { prevPeriodNumber: 52, prevYear: year - 1 };
  } else {
    if (periodNumber > 1) {
      return { prevPeriodNumber: periodNumber - 1, prevYear: year };
    }
    return { prevPeriodNumber: 12, prevYear: year - 1 };
  }
}

export function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime() + (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000;
  const oneWeek = 604800000;
  return Math.min(52, Math.max(1, Math.ceil(diff / oneWeek)));
}

export function getCurrentMonthNumber(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

// Helper trích xuất danh sách nền tảng cho 1 nội dung (hỗ trợ đa nền tảng)
export function extractContentPlatforms(c: {
  platform?: string;
  platform_raw?: string;
  platforms?: string[];
}): { platformKey: "facebook" | "tiktok" | "youtube" | "website"; platformName: string }[] {
  const result: { platformKey: "facebook" | "tiktok" | "youtube" | "website"; platformName: string }[] = [];
  const seen = new Set<string>();

  const rawList: string[] = [];
  if (Array.isArray(c.platforms) && c.platforms.length > 0) {
    rawList.push(...c.platforms);
  } else if (c.platform_raw) {
    rawList.push(...c.platform_raw.split(",").map((s) => s.trim()));
  } else if (c.platform) {
    rawList.push(...c.platform.split(",").map((s) => s.trim()));
  }

  for (const item of rawList) {
    const s = item.toLowerCase();
    if (s.includes("facebook") && !seen.has("facebook")) {
      seen.add("facebook");
      result.push({ platformKey: "facebook", platformName: "Facebook" });
    }
    if (s.includes("tiktok") && !seen.has("tiktok")) {
      seen.add("tiktok");
      result.push({ platformKey: "tiktok", platformName: "TikTok" });
    }
    if (s.includes("youtube") && !seen.has("youtube")) {
      seen.add("youtube");
      result.push({ platformKey: "youtube", platformName: "YouTube" });
    }
    if (s.includes("website") && !seen.has("website")) {
      seen.add("website");
      result.push({ platformKey: "website", platformName: "Website" });
    }
  }

  if (result.length === 0) {
    const s = (c.platform_raw || c.platform || "").toLowerCase();
    if (s.includes("tiktok")) {
      result.push({ platformKey: "tiktok", platformName: "TikTok" });
    } else if (s.includes("youtube")) {
      result.push({ platformKey: "youtube", platformName: "YouTube" });
    } else if (s.includes("website")) {
      result.push({ platformKey: "website", platformName: "Website" });
    } else {
      result.push({ platformKey: "facebook", platformName: "Facebook" });
    }
  }

  return result;
}

// ==============================================================================
// CORE DATA AGGREGATION ENGINE
// ==============================================================================

async function computePeriodMetrics(
  startDate: string,
  endDate: string,
  branchId: string
) {
  // Query source data
  const targetBranch = branchId === "all" ? undefined : branchId;
  const [contents, campaigns, leads] = await Promise.all([
    fetchMarketingContents(undefined, targetBranch, startDate, endDate),
    fetchMarketingCampaigns(undefined, targetBranch, startDate, endDate),
    fetchMarketingLeads(undefined, targetBranch, startDate, endDate),
  ]);

  // 1. KÊNH & NỘI DUNG (Facebook, TikTok, YouTube, Website)
  const channelContents = {
    facebook: contents.filter((c) => matchesPlatform(c.platform_raw || c.platform, "facebook")),
    tiktok: contents.filter((c) => matchesPlatform(c.platform_raw || c.platform, "tiktok")),
    youtube: contents.filter((c) => matchesPlatform(c.platform_raw || c.platform, "youtube")),
    website: contents.filter((c) => matchesPlatform(c.platform_raw || c.platform, "website")),
  };

  // Lead metrics theo kênh (Facebook = Organic + Ads, TikTok = Organic + Ads)
  const channelLeads = {
    facebook: leads.filter((l) => l.source === "facebook_organic" || l.source === "facebook_ads"),
    tiktok: leads.filter((l) => l.source === "tiktok_organic" || l.source === "tiktok_ads"),
    youtube: leads.filter((l) => l.source === "youtube"),
    website: leads.filter((l) => l.source === "website"),
  };

  const countStatus = (leadList: typeof leads) => ({
    total: leadList.length,
    consulted: leadList.filter((l) => ["consulted", "discussing", "converted", "closed"].includes(l.status)).length,
    converted: leadList.filter((l) => ["converted", "closed"].includes(l.status)).length,
    closed: leadList.filter((l) => l.status === "closed").length,
  });

  const fbLeadStats = countStatus(channelLeads.facebook);
  const ttLeadStats = countStatus(channelLeads.tiktok);
  const ytLeadStats = countStatus(channelLeads.youtube);
  const wsLeadStats = countStatus(channelLeads.website);

  const fbViews = channelContents.facebook.reduce((acc, c) => acc + (c.views || 0), 0);
  const fbInteractions = channelContents.facebook.reduce((acc, c) => acc + (c.interactions || 0), 0);

  const ttViews = channelContents.tiktok.reduce((acc, c) => acc + (c.views || 0), 0);
  const ttInteractions = channelContents.tiktok.reduce((acc, c) => acc + (c.interactions || 0), 0);

  const ytViews = channelContents.youtube.reduce((acc, c) => acc + (c.views || 0), 0);
  const ytInteractions = channelContents.youtube.reduce((acc, c) => acc + (c.interactions || 0), 0);

  const wsViews = channelContents.website.reduce((acc, c) => acc + (c.views || 0), 0);

  const channelResults: ChannelResultRow[] = [
    {
      platform: "facebook",
      platformName: "Facebook",
      contentCount: channelContents.facebook.length,
      views: fbViews,
      interactions: fbInteractions,
      leads: fbLeadStats.total,
      consulted: fbLeadStats.consulted,
      converted: fbLeadStats.converted,
      orders: fbLeadStats.closed,
    },
    {
      platform: "tiktok",
      platformName: "TikTok",
      contentCount: channelContents.tiktok.length,
      views: ttViews,
      interactions: ttInteractions,
      leads: ttLeadStats.total,
      consulted: ttLeadStats.consulted,
      converted: ttLeadStats.converted,
      orders: ttLeadStats.closed,
    },
    {
      platform: "youtube",
      platformName: "YouTube",
      contentCount: channelContents.youtube.length,
      views: ytViews,
      interactions: ytInteractions,
      leads: ytLeadStats.total,
      consulted: ytLeadStats.consulted,
      converted: ytLeadStats.converted,
      orders: ytLeadStats.closed,
    },
    {
      platform: "website",
      platformName: "Website",
      contentCount: channelContents.website.length,
      views: wsViews,
      interactions: null, // "—" per specification
      leads: wsLeadStats.total,
      consulted: wsLeadStats.consulted,
      converted: wsLeadStats.converted,
      orders: wsLeadStats.closed,
    },
  ];

  // Distinct system leads (không đếm trùng)
  const systemLeadStats = countStatus(leads);

  const totalChannelContentCount =
    channelContents.facebook.length +
    channelContents.tiktok.length +
    channelContents.youtube.length +
    channelContents.website.length;

  const channelTotals = {
    contentCount: totalChannelContentCount,
    views: fbViews + ttViews + ytViews + wsViews,
    interactions: fbInteractions + ttInteractions + ytInteractions,
    leads: systemLeadStats.total,
    consulted: systemLeadStats.consulted,
    converted: systemLeadStats.converted,
    orders: systemLeadStats.closed,
  };



  // Full contents grouped by branch (theo thứ tự chi nhánh Hatico), then sorted by publish_date desc
  // Phân rã (flatten) nội dung đa nền tảng thành từng dòng bài đăng độc lập theo từng nền tảng
  const branchOrderMap = new Map<string, number>(HATICO_BRANCHES.map((b, idx) => [b.id as string, idx]));
  const topContents: TopContentItem[] = contents
    .flatMap((c) => {
      const effBranchId = c.branch_id || HATICO_BRANCHES[0].id;
      const bObj = HATICO_BRANCHES.find((b) => b.id === effBranchId);
      const platforms = extractContentPlatforms(c);
      return platforms.map((p) => ({
        id: platforms.length > 1 ? `${c.id}_${p.platformKey}` : c.id,
        title: c.title,
        platform: p.platformName,
        platformKey: p.platformKey,
        publishDate: c.publish_date,
        views: c.views || 0,
        interactions: c.interactions || 0,
        link: c.link,
        contentType: c.content_type,
        authorName: c.author_name,
        branchId: effBranchId,
        branchName: bObj?.name || HATICO_BRANCHES[0].name,
        leads: c.leads_count || 0,
        orders: c.orders_count || 0,
      }));
    })
    .sort((a, b) => {
      // 1. Gom nhóm theo từng chi nhánh trước (không phân chia ngẫu nhiên)
      const orderA = branchOrderMap.get(a.branchId || "") ?? 999;
      const orderB = branchOrderMap.get(b.branchId || "") ?? 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // 2. Trong cùng 1 chi nhánh: sắp xếp bài mới nhất trước, sau đó theo lượt xem
      if (b.publishDate !== a.publishDate) {
        return b.publishDate.localeCompare(a.publishDate);
      }
      return b.views - a.views;
    });

  // 2. CHIẾN DỊCH QUẢNG CÁO (Facebook Ads, TikTok Ads)
  const fbCampaigns = campaigns.filter((c) => c.platform === "facebook_ads");
  const ttCampaigns = campaigns.filter((c) => c.platform === "tiktok_ads");

  const buildAdReport = (
    platformKey: "facebook_ads" | "tiktok_ads",
    platformName: string,
    cList: typeof campaigns
  ): AdPlatformReport => {
    let totalCost = 0;
    const detailRows = cList.map((c) => {
      const campCost = Number(c.actual_cost || 0);
      totalCost += campCost;
      const campLeads = leads.filter((l) => l.campaign_id === c.id);
      const stats = countStatus(campLeads);
      const cpl = stats.total > 0 ? Math.round(campCost / stats.total) : null;
      const branchObj = HATICO_BRANCHES.find((b) => b.id === c.branch_id);
      return {
        id: c.id,
        name: c.name,
        branchName: branchObj ? branchObj.name : "Toàn hệ thống",
        cost: campCost,
        leads: stats.total,
        consulted: stats.consulted,
        orders: stats.closed,
        cpl,
      };
    });

    const directAdLeads = leads.filter((l) => l.source === platformKey);
    const adStats = countStatus(directAdLeads);
    const overallCpl = adStats.total > 0 ? Math.round(totalCost / adStats.total) : null;

    return {
      platform: platformKey,
      platformName,
      activeCampaignsCount: cList.length,
      totalCost,
      leads: adStats.total,
      consulted: adStats.consulted,
      converted: adStats.converted,
      orders: adStats.closed,
      cpl: overallCpl,
      campaigns: detailRows,
    };
  };

  const facebookAds = buildAdReport("facebook_ads", "Facebook Ads", fbCampaigns);
  const tiktokAds = buildAdReport("tiktok_ads", "TikTok Ads", ttCampaigns);

  const totalAdCost = facebookAds.totalCost + tiktokAds.totalCost;
  const totalAdLeads = facebookAds.leads + tiktokAds.leads;
  const totalAdConsulted = facebookAds.consulted + tiktokAds.consulted;
  const totalAdConverted = facebookAds.converted + tiktokAds.converted;
  const totalAdOrders = facebookAds.orders + tiktokAds.orders;
  const totalAdCpl = totalAdLeads > 0 ? Math.round(totalAdCost / totalAdLeads) : null;

  const adComparison: AdComparisonSummary = {
    facebook: {
      cost: facebookAds.totalCost,
      leads: facebookAds.leads,
      consulted: facebookAds.consulted,
      converted: facebookAds.converted,
      orders: facebookAds.orders,
      cpl: facebookAds.cpl,
    },
    tiktok: {
      cost: tiktokAds.totalCost,
      leads: tiktokAds.leads,
      consulted: tiktokAds.consulted,
      converted: tiktokAds.converted,
      orders: tiktokAds.orders,
      cpl: tiktokAds.cpl,
    },
    total: {
      cost: totalAdCost,
      leads: totalAdLeads,
      consulted: totalAdConsulted,
      converted: totalAdConverted,
      orders: totalAdOrders,
      cpl: totalAdCpl,
    },
  };

  // 3. KẾT QUẢ THEO CHI NHÁNH (5 chi nhánh Hatico)
  const branchResults: BranchResultRow[] = HATICO_BRANCHES.map((b) => {
    const bContents = contents.filter((c) => {
      const effBranchId = c.branch_id || HATICO_BRANCHES[0].id;
      return effBranchId === b.id;
    });
    const bPostCount = bContents.reduce(
      (sum, c) => sum + extractContentPlatforms(c).length,
      0
    );
    const bLeads = leads.filter((l) => l.branch_id === b.id);
    const bStats = countStatus(bLeads);
    const bCampaigns = campaigns.filter((c) => c.branch_id === b.id);
    const bAdSpend = bCampaigns.reduce((acc, c) => acc + Number(c.actual_cost || 0), 0);

    return {
      branchId: b.id,
      branchName: b.name,
      contentCount: bPostCount,
      leads: bStats.total,
      consulted: bStats.consulted,
      converted: bStats.converted,
      orders: bStats.closed,
      adSpend: bAdSpend,
    };
  });

  const totalBranchContentCount = branchResults.reduce((acc, b) => acc + b.contentCount, 0);

  const totalSystemBranch: BranchResultRow = {
    branchId: "all",
    branchName: "Toàn hệ thống",
    contentCount: totalBranchContentCount,
    leads: systemLeadStats.total,
    consulted: systemLeadStats.consulted,
    converted: systemLeadStats.converted,
    orders: systemLeadStats.closed,
    adSpend: totalAdCost,
  };

  // 4. TỔNG HỢP 8 CHỈ SỐ KPI CHÍNH
  const kpis: PeriodicReportKPIs = {
    totalContents: totalBranchContentCount,
    totalViews: channelTotals.views,
    totalInteractions: channelTotals.interactions,
    totalLeads: systemLeadStats.total,
    totalConsulted: systemLeadStats.consulted,
    totalConverted: systemLeadStats.converted,
    totalOrders: systemLeadStats.closed,
    totalAdSpend: totalAdCost,
  };

  return {
    kpis,
    channelResults,
    channelTotals,
    topContents,
    facebookAds,
    tiktokAds,
    adComparison,
    branchResults,
    totalSystemBranch,
  };
}

export async function aggregatePeriodicReportDataByRange(
  startDate: string,
  endDate: string,
  branchId: string = "all"
): Promise<PeriodicReportDataSnapshot> {
  const formatISO = (d: Date) => d.toISOString().split("T")[0];

  const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
  const endMs = new Date(`${endDate}T00:00:00Z`).getTime();
  const diffDays = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);

  // Exact previous period of identical day duration
  const prevEndMs = startMs - 86400000;
  const prevStartMs = prevEndMs - (diffDays - 1) * 86400000;
  const prevStartDate = formatISO(new Date(prevStartMs));
  const prevEndDate = formatISO(new Date(prevEndMs));

  const [currentMetrics, prevMetrics] = await Promise.all([
    computePeriodMetrics(startDate, endDate, branchId),
    computePeriodMetrics(prevStartDate, prevEndDate, branchId),
  ]);

  const kpiKeys: (keyof PeriodicReportKPIs)[] = [
    "totalContents",
    "totalViews",
    "totalInteractions",
    "totalLeads",
    "totalConsulted",
    "totalConverted",
    "totalOrders",
    "totalAdSpend",
  ];

  const kpiComparison = {} as Record<keyof PeriodicReportKPIs, KPICardComparison>;

  for (const k of kpiKeys) {
    const curVal = currentMetrics.kpis[k];
    const prevVal = prevMetrics.kpis[k];
    const diff = curVal - prevVal;
    const percent = prevVal > 0 ? Number(((diff / prevVal) * 100).toFixed(1)) : null;
    kpiComparison[k] = {
      current: curVal,
      previous: prevVal,
      diff,
      percent,
    };
  }

  return {
    kpis: currentMetrics.kpis,
    prevKpis: prevMetrics.kpis,
    kpiComparison,
    channelResults: currentMetrics.channelResults,
    channelTotals: currentMetrics.channelTotals,
    topContents: currentMetrics.topContents,
    facebookAds: currentMetrics.facebookAds,
    tiktokAds: currentMetrics.tiktokAds,
    adComparison: currentMetrics.adComparison,
    branchResults: currentMetrics.branchResults,
    totalSystemBranch: currentMetrics.totalSystemBranch,
  };
}

export async function aggregatePeriodicReportData(
  reportType: PeriodicReportType,
  periodNumber: number,
  year: number,
  branchId: string = "all"
): Promise<PeriodicReportDataSnapshot> {
  const { startDate, endDate } =
    reportType === "weekly"
      ? getWeekDateRange(periodNumber, year)
      : getMonthDateRange(periodNumber, year);

  return aggregatePeriodicReportDataByRange(startDate, endDate, branchId);
}

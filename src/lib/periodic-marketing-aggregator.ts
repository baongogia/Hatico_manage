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
} from "./marketing-db";
import { HATICO_BRANCHES } from "./marketing-types";

// ==============================================================================
// DATE RANGE CALCULATION HELPERS
// ==============================================================================

export function getWeekDateRange(weekNumber: number, year: number): { startDate: string; endDate: string } {
  const simple = new Date(Date.UTC(year, 0, 1 + (weekNumber - 1) * 7));
  const dayOfWeek = simple.getUTCDay();
  const ISOweekStart = new Date(simple);
  if (dayOfWeek <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }
  const start = new Date(ISOweekStart);
  const end = new Date(ISOweekStart);
  end.setUTCDate(end.getUTCDate() + 6);
  const formatISO = (d: Date) => d.toISOString().split("T")[0];
  return { startDate: formatISO(start), endDate: formatISO(end) };
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
    fetchMarketingLeads(undefined, undefined, targetBranch, startDate, endDate),
  ]);

  // 1. KÊNH & NỘI DUNG (Facebook, TikTok, YouTube, Website)
  const channelContents = {
    facebook: contents.filter((c) => c.platform === "facebook"),
    tiktok: contents.filter((c) => c.platform === "tiktok"),
    youtube: contents.filter((c) => c.platform === "youtube"),
    website: contents.filter((c) => c.platform === "website"),
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

  const channelTotals = {
    contentCount: contents.length,
    views: fbViews + ttViews + ytViews + wsViews,
    interactions: fbInteractions + ttInteractions + ytInteractions,
    leads: systemLeadStats.total,
    consulted: systemLeadStats.consulted,
    converted: systemLeadStats.converted,
    orders: systemLeadStats.closed,
  };

  // Top contents sorted by views
  const topContents: TopContentItem[] = contents
    .map((c) => ({
      id: c.id,
      title: c.title,
      platform:
        c.platform === "facebook"
          ? "Facebook"
          : c.platform === "tiktok"
          ? "TikTok"
          : c.platform === "youtube"
          ? "YouTube"
          : "Website",
      platformKey: c.platform,
      publishDate: c.publish_date,
      views: c.views || 0,
      interactions: c.interactions || 0,
      link: c.link,
    }))
    .sort((a, b) => b.views - a.views);

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
    const bContents = contents.filter((c) => c.branch_id === b.id);
    const bLeads = leads.filter((l) => l.branch_id === b.id || l.handler_branch_id === b.id);
    const bStats = countStatus(bLeads);
    const bCampaigns = campaigns.filter((c) => c.branch_id === b.id);
    const bAdSpend = bCampaigns.reduce((acc, c) => acc + Number(c.actual_cost || 0), 0);

    return {
      branchId: b.id,
      branchName: b.name,
      contentCount: bContents.length,
      leads: bStats.total,
      consulted: bStats.consulted,
      converted: bStats.converted,
      orders: bStats.closed,
      adSpend: bAdSpend,
    };
  });

  const totalSystemBranch: BranchResultRow = {
    branchId: "all",
    branchName: "Toàn hệ thống",
    contentCount: contents.length,
    leads: systemLeadStats.total,
    consulted: systemLeadStats.consulted,
    converted: systemLeadStats.converted,
    orders: systemLeadStats.closed,
    adSpend: totalAdCost,
  };

  // 4. TỔNG HỢP 8 CHỈ SỐ KPI CHÍNH
  const kpis: PeriodicReportKPIs = {
    totalContents: contents.length,
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

export async function aggregatePeriodicReportData(
  reportType: PeriodicReportType,
  periodNumber: number,
  year: number,
  branchId: string = "all"
): Promise<PeriodicReportDataSnapshot> {
  // Current Period Bounds
  const { startDate, endDate } =
    reportType === "weekly"
      ? getWeekDateRange(periodNumber, year)
      : getMonthDateRange(periodNumber, year);

  // Previous Period Bounds
  const { prevPeriodNumber, prevYear } = getPreviousPeriod(reportType, periodNumber, year);
  const { startDate: prevStartDate, endDate: prevEndDate } =
    reportType === "weekly"
      ? getWeekDateRange(prevPeriodNumber, prevYear)
      : getMonthDateRange(prevPeriodNumber, prevYear);

  // Aggregate current and previous in parallel
  const [currentMetrics, prevMetrics] = await Promise.all([
    computePeriodMetrics(startDate, endDate, branchId),
    computePeriodMetrics(prevStartDate, prevEndDate, branchId),
  ]);

  // Compute comparisons
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

  const kpiComparison: Record<keyof PeriodicReportKPIs, KPICardComparison> = {} as any;

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

import {
  WeeklyMarketingReport,
  WeeklyMarketingReportSummary,
  ReportStatus,
} from "./weekly-marketing-types";
import { calculateExecutiveKPIs } from "./weekly-marketing-calculator";

const STORAGE_KEY = "hatico_weekly_marketing_reports_v2";

/**
 * Get date range (Monday to Sunday) for ISO week number in year
 */
export function getWeekDateRange(weekNumber: number, year: number): { startDate: string; endDate: string } {
  // Simple ISO week calculation
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
  return {
    startDate: formatISO(start),
    endDate: formatISO(end),
  };
}

export function formatVNShortDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function formatWeekRangeDisplay(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "";
  return `${formatVNShortDate(startDate)} – ${formatVNShortDate(endDate)}`;
}

export function getDefaultInitialReports(): WeeklyMarketingReport[] {
  return [createBlankReportTemplate(41, 2026, "Ngô Gia Bảo")];
}

export function loadAllWeeklyReports(): WeeklyMarketingReport[] {
  if (typeof window === "undefined") {
    return getDefaultInitialReports();
  }

  try {
    // Purge old mock data storage
    localStorage.removeItem("hatico_weekly_marketing_reports_v1");

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultInitialReports();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as WeeklyMarketingReport[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = getDefaultInitialReports();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed;
  } catch (err) {
    console.error("Error reading weekly marketing reports from localStorage:", err);
    return getDefaultInitialReports();
  }
}

export function saveAllWeeklyReports(reports: WeeklyMarketingReport[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error("Error saving weekly marketing reports:", err);
  }
}

export function getWeeklyReportById(reportId: string): WeeklyMarketingReport | null {
  const reports = loadAllWeeklyReports();
  return reports.find((r) => r.reportId === reportId) || null;
}

export function getWeeklyReportByWeek(weekNumber: number, year: number): WeeklyMarketingReport | null {
  const reports = loadAllWeeklyReports();
  return reports.find((r) => r.weekNumber === weekNumber && r.year === year) || null;
}

export function saveOrUpdateWeeklyReport(updated: WeeklyMarketingReport): WeeklyMarketingReport[] {
  const reports = loadAllWeeklyReports();
  const idx = reports.findIndex((r) => r.reportId === updated.reportId);
  const now = new Date().toISOString();

  let nextReports: WeeklyMarketingReport[];
  if (idx >= 0) {
    nextReports = [...reports];
    nextReports[idx] = {
      ...updated,
      updatedAt: now,
    };
  } else {
    nextReports = [
      {
        ...updated,
        createdAt: now,
        updatedAt: now,
      },
      ...reports,
    ];
  }

  saveAllWeeklyReports(nextReports);
  return nextReports;
}

export function submitWeeklyReport(reportId: string, submittedBy: string): WeeklyMarketingReport | null {
  const reports = loadAllWeeklyReports();
  const idx = reports.findIndex((r) => r.reportId === reportId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  const updated: WeeklyMarketingReport = {
    ...reports[idx],
    status: "submitted",
    submittedAt: now,
    createdBy: submittedBy || reports[idx].createdBy,
    updatedAt: now,
  };

  reports[idx] = updated;
  saveAllWeeklyReports(reports);
  return updated;
}

export function approveWeeklyReport(reportId: string, approvedBy: string): WeeklyMarketingReport | null {
  const reports = loadAllWeeklyReports();
  const idx = reports.findIndex((r) => r.reportId === reportId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  const updated: WeeklyMarketingReport = {
    ...reports[idx],
    status: "approved",
    approvedAt: now,
    approvedBy: approvedBy || "Ban Giám Đốc",
    updatedAt: now,
  };

  reports[idx] = updated;
  saveAllWeeklyReports(reports);
  return updated;
}

export function createBlankReportTemplate(weekNumber: number, year: number, authorName: string): WeeklyMarketingReport {
  const { startDate, endDate } = getWeekDateRange(weekNumber, year);
  const now = new Date().toISOString();

  return {
    reportId: `rep-${year}-w${weekNumber}`,
    weekNumber,
    year,
    startDate,
    endDate,
    createdBy: authorName || "Ngô Gia Bảo",
    createdAt: now,
    updatedAt: now,
    status: "draft",

    tiktokMetrics: {
      followersStart: null,
      followersEnd: null,
      newFollowers: null,
      videosPublished: null,
      totalViews: null,
      uniqueReach: null,
      profileViews: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
      bestVideoTitle: null,
      bestVideoViews: null,
      bestVideoEngagement: null,
      leads: null,
      notes: null,
      adSpend: null,
      adImpressions: null,
      adReach: null,
      adClicks: null,
      adLeads: null,
      adConversions: null,
    },

    facebookMetrics: {
      followersStart: null,
      followersEnd: null,
      newFollowers: null,
      postsPublished: null,
      reach: null,
      impressions: null,
      pageViews: null,
      postEngagements: null,
      likes: null,
      comments: null,
      shares: null,
      linkClicks: null,
      messagesStarted: null,
      leads: null,
      qualifiedLeads: null,
      conversions: null,
      bestPostTitle: null,
      adSpend: null,
      adReach: null,
      adImpressions: null,
      adFrequency: null,
      adLinkClicks: null,
      adLeads: null,
      adConversions: null,
    },

    websiteMetrics: {
      totalUsers: null,
      newUsers: null,
      sessions: null,
      pageViews: null,
      avgSessionDurationSeconds: null,
      bounceRate: null,
      engagementRate: null,
      trafficOrganicSearch: null,
      trafficFacebook: null,
      trafficTiktok: null,
      trafficDirect: null,
      trafficReferral: null,
      contactFormSubmissions: null,
      phoneCallClicks: null,
      zaloClicks: null,
      quoteRequests: null,
      leads: null,
      qualifiedLeads: null,
      conversions: null,
      topLandingPages: [],
      topTrafficSources: [],
      bestPerformingPage: null,
    },

    leadMetrics: {
      totalLeads: null,
      newLeads: null,
      qualifiedLeads: null,
      customersContacted: null,
      quoteRequests: null,
      quotationsSent: null,
      convertedCustomers: null,
      revenueGenerated: null,
      channelBreakdown: [
        { source: "Facebook Ads", leads: null, qualifiedLeads: null, conversions: null, adSpend: null },
        { source: "TikTok Organic", leads: null, qualifiedLeads: null, conversions: null, adSpend: null },
        { source: "TikTok Ads", leads: null, qualifiedLeads: null, conversions: null, adSpend: null },
        { source: "Website SEO Organic", leads: null, qualifiedLeads: null, conversions: null, adSpend: null },
        { source: "Website Hotline & Zalo", leads: null, qualifiedLeads: null, conversions: null, adSpend: null },
        { source: "Facebook Organic", leads: null, qualifiedLeads: null, conversions: null, adSpend: null },
        { source: "Giới thiệu (Referral)", leads: null, qualifiedLeads: null, conversions: null, adSpend: null },
      ],
    },

    contentPerformance: [],

    weeklyAnalysis: {
      highlights: [],
      bestContentRationale: null,
      issuesAndImprovements: [],
      nextWeekPlan: [],
      recommendations: [],
    },
  };
}

export function getWeeklySummaries(reports: WeeklyMarketingReport[]): WeeklyMarketingReportSummary[] {
  return reports.map((r) => {
    const kpis = calculateExecutiveKPIs(r);
    return {
      reportId: r.reportId,
      weekNumber: r.weekNumber,
      year: r.year,
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status,
      submittedAt: r.submittedAt,
      createdBy: r.createdBy,
      totalReach: kpis.totalReach,
      totalLeads: kpis.totalLeads,
      totalConversions: kpis.totalConversions,
    };
  });
}

export function deleteWeeklyReport(reportId: string): WeeklyMarketingReport[] {
  const reports = loadAllWeeklyReports();
  const nextReports = reports.filter((r) => r.reportId !== reportId);
  saveAllWeeklyReports(nextReports);
  return nextReports;
}

export function resetReportsToBlank(authorName: string): WeeklyMarketingReport[] {
  const blankRep = createBlankReportTemplate(41, 2026, authorName);
  saveAllWeeklyReports([blankRep]);
  return [blankRep];
}

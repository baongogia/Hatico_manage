import {
  WeeklyMarketingReport,
  TiktokMetrics,
  FacebookMetrics,
  WebsiteMetrics,
} from "./weekly-marketing-types";

/**
 * Core utility: Checks whether a value is meaningful and entered.
 * hasValue(null)      => false
 * hasValue(undefined) => false
 * hasValue("")        => false
 * hasValue("   ")     => false
 * hasValue(0)         => true
 * hasValue("0")       => true
 * hasValue(120)       => true
 */
export function hasValue(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (typeof val === "number") return !isNaN(val);
  return true;
}

/**
 * Checks whether an object, array, or section has any meaningful value entered.
 */
export function hasAnyValue(
  target: unknown,
  keysToCheck?: string[]
): boolean {
  if (!target) return false;
  if (Array.isArray(target)) {
    return target.some((item) => {
      if (typeof item === "object" && item !== null) {
        return hasAnyValue(item);
      }
      return hasValue(item);
    });
  }
  if (typeof target !== "object") {
    return hasValue(target);
  }
  const obj = target as Record<string, unknown>;
  const keys = keysToCheck || Object.keys(obj);
  return keys.some((key) => {
    const val = obj[key];
    if (val === null || val === undefined) return false;
    if (typeof val === "object") {
      return hasAnyValue(val);
    }
    return hasValue(val);
  });
}

export interface CalculatedExecutiveKPIs {
  totalReach: number | null;
  totalViews: number | null;
  totalEngagement: number | null;
  totalLeads: number | null;
  qualifiedLeads: number | null;
  totalConversions: number | null;
  revenueGenerated: number | null;
  conversionRate: number | null; // %
  totalAdSpend: number | null; // VND
  costPerLead: number | null; // CPL in VND
  costPerConversion: number | null; // VND
}

export interface CalculatedTiktokMetrics {
  followerGrowthRate: number | null; // %
  avgViewsPerVideo: number | null;
  avgEngagementPerVideo: number | null;
  engagementRate: number | null; // %
  totalEngagement: number | null;
  // Paid
  ctr: number | null; // %
  cpc: number | null; // VND
  cpl: number | null; // VND
  costPerConversion: number | null; // VND
}

export interface CalculatedFacebookMetrics {
  followerGrowthRate: number | null; // %
  engagementRate: number | null; // %
  totalEngagement: number | null;
  conversionRate: number | null; // %
  // Paid
  ctr: number | null; // %
  cpc: number | null; // VND
  cpm: number | null; // VND
  cpl: number | null; // VND
  costPerConversion: number | null; // VND
}

export interface CalculatedWebsiteMetrics {
  leadConversionRate: number | null; // % (Leads / Sessions * 100)
  customerConversionRate: number | null; // % (Customers / Leads * 100)
  sessionConversionRate: number | null; // % (Customers / Sessions * 100)
  conversionRate: number | null; // % (Primary: Customers / Leads)
  formattedDuration: string | null;
}

export interface FunnelStage {
  label: string;
  subLabel?: string;
  count: number;
  rateFromPrevious?: number; // %
  description: string;
}

export interface CalculatedFunnel {
  stages: FunnelStage[];
}

export function formatNumber(val: number | undefined | null): string {
  if (!hasValue(val)) return "";
  return new Intl.NumberFormat("vi-VN").format(Math.round(val as number));
}

export function formatCurrencyVND(val: number | undefined | null): string {
  if (!hasValue(val)) return "";
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(val as number))} ₫`;
}

export function formatPercent(val: number | undefined | null, decimals = 1): string {
  if (!hasValue(val)) return "";
  return `${(val as number).toFixed(decimals)}%`;
}

export function formatCompactNumber(val: number | undefined | null): string {
  if (!hasValue(val)) return "";
  const n = val as number;
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

export function formatCompactVND(val: number | undefined | null): string {
  if (!hasValue(val)) return "";
  const n = val as number;
  if (Math.abs(n) >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)} tỷ ₫`;
  }
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M ₫`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${(n / 1_000).toFixed(0)}K ₫`;
  }
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))} ₫`;
}

export function formatDurationSeconds(seconds: number | undefined | null): string | null {
  if (!hasValue(seconds) || (seconds as number) <= 0) return null;
  const s = seconds as number;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

export function getFunnelBiggestDropoff(funnel: CalculatedFunnel): {
  fromStage: string;
  toStage: string;
  rate: number;
  stageIndex: number;
} | null {
  const { stages } = funnel;
  if (!stages || stages.length < 2) return null;

  let lowestRate = 100;
  let biggestDrop: { fromStage: string; toStage: string; rate: number; stageIndex: number } | null = null;

  for (let i = 1; i < stages.length; i++) {
    const rate = stages[i].rateFromPrevious;
    if (rate !== undefined && rate < lowestRate) {
      lowestRate = rate;
      biggestDrop = {
        fromStage: stages[i - 1].subLabel || stages[i - 1].label.split("(")[0].trim(),
        toStage: stages[i].subLabel || stages[i].label.split("(")[0].trim(),
        rate: Number(rate.toFixed(1)),
        stageIndex: i,
      };
    }
  }

  return biggestDrop;
}

export function generateWeeklyInsight(
  report: WeeklyMarketingReport,
  previousReport?: WeeklyMarketingReport | null
): string {
  const curKPIs = calculateExecutiveKPIs(report);
  const prevKPIs = previousReport ? calculateExecutiveKPIs(previousReport) : null;

  if (!hasValue(curKPIs.totalLeads) && !hasValue(curKPIs.totalConversions)) {
    return "";
  }

  const leadsStr = hasValue(curKPIs.totalLeads) ? `${curKPIs.totalLeads} khách tiềm năng (Leads)` : "";
  const convsStr = hasValue(curKPIs.totalConversions) ? `chốt ${curKPIs.totalConversions} xe` : "";
  const baseResult = [leadsStr, convsStr].filter(Boolean).join(" và ");

  if (!prevKPIs || !hasValue(prevKPIs.totalLeads)) {
    const spendNote = hasValue(curKPIs.totalAdSpend) ? ` với ngân sách ${formatCompactVND(curKPIs.totalAdSpend)}` : "";
    return `Tuần ${report.weekNumber} ghi nhận ${baseResult}${spendNote}.`;
  }

  const leadDiff = prevKPIs.totalLeads && prevKPIs.totalLeads > 0 && hasValue(curKPIs.totalLeads)
    ? (((curKPIs.totalLeads as number) - prevKPIs.totalLeads) / prevKPIs.totalLeads) * 100
    : null;
  const custDiff = prevKPIs.totalConversions && prevKPIs.totalConversions > 0 && hasValue(curKPIs.totalConversions)
    ? (((curKPIs.totalConversions as number) - prevKPIs.totalConversions) / prevKPIs.totalConversions) * 100
    : null;

  const leadTrend = leadDiff !== null
    ? `Khách tiềm năng (Leads) ${leadDiff >= 0 ? "tăng " + leadDiff.toFixed(1) + "%" : "giảm " + Math.abs(leadDiff).toFixed(1) + "%"}`
    : "";
  const custTrend = custDiff !== null
    ? `khách chốt ${custDiff >= 0 ? "tăng " + custDiff.toFixed(1) + "%" : "giảm " + Math.abs(custDiff).toFixed(1) + "%"}`
    : "";
  const trendSummary = [leadTrend, custTrend].filter(Boolean).join(", ");

  return `Tuần này hiệu suất Marketing duy trì tích cực. ${trendSummary || baseResult}.`;
}

export function calculateExecutiveKPIs(report: WeeklyMarketingReport): CalculatedExecutiveKPIs {
  const tk = report.tiktokMetrics || {};
  const fb = report.facebookMetrics || {};
  const web = report.websiteMetrics || {};
  const lead = report.leadMetrics || {};

  // Reach & Views
  const reachVals = [tk.uniqueReach, fb.reach, web.totalUsers].filter(hasValue) as number[];
  const totalReach = reachVals.length > 0 ? reachVals.reduce((a, b) => a + b, 0) : null;

  const viewVals = [tk.totalViews, fb.impressions, web.pageViews].filter(hasValue) as number[];
  const totalViews = viewVals.length > 0 ? viewVals.reduce((a, b) => a + b, 0) : null;

  // Engagement
  const tkEngVals = [tk.likes, tk.comments, tk.shares, tk.saves].filter(hasValue) as number[];
  const tkEng = tkEngVals.length > 0 ? tkEngVals.reduce((a, b) => a + b, 0) : 0;
  const fbEng = hasValue(fb.postEngagements)
    ? (fb.postEngagements as number)
    : ([fb.likes, fb.comments, fb.shares, fb.linkClicks].filter(hasValue) as number[]).reduce((a, b) => a + b, 0);
  const totalEngagement = (tkEngVals.length > 0 || hasValue(fb.postEngagements) || hasValue(fb.likes))
    ? tkEng + fbEng
    : null;

  // Leads & Conversions
  let totalLeads: number | null = null;
  if (hasValue(lead.totalLeads)) {
    totalLeads = lead.totalLeads as number;
  } else {
    const leadVals = [tk.leads, fb.leads, web.leads, tk.adLeads, fb.adLeads].filter(hasValue) as number[];
    if (leadVals.length > 0) {
      totalLeads = leadVals.reduce((a, b) => a + b, 0);
    }
  }

  const qualifiedLeads = hasValue(lead.qualifiedLeads)
    ? (lead.qualifiedLeads as number)
    : hasValue(fb.qualifiedLeads) || hasValue(web.qualifiedLeads)
    ? (fb.qualifiedLeads || 0) + (web.qualifiedLeads || 0)
    : null;

  let totalConversions: number | null = null;
  if (hasValue(lead.convertedCustomers)) {
    totalConversions = lead.convertedCustomers as number;
  } else {
    const convVals = [fb.conversions, web.conversions, tk.adConversions, fb.adConversions].filter(hasValue) as number[];
    if (convVals.length > 0) {
      totalConversions = convVals.reduce((a, b) => a + b, 0);
    }
  }

  const revenueGenerated = hasValue(lead.revenueGenerated) ? (lead.revenueGenerated as number) : null;

  // Conversion rate: Conversions / Leads (Only if both exist)
  const conversionRate = hasValue(totalLeads) && hasValue(totalConversions) && (totalLeads as number) > 0
    ? Number((((totalConversions as number) / (totalLeads as number)) * 100).toFixed(2))
    : null;

  // Ad Spend
  const spendVals = [tk.adSpend, fb.adSpend].filter(hasValue) as number[];
  const totalAdSpend = spendVals.length > 0 ? spendVals.reduce((a, b) => a + b, 0) : null;

  // Cost per lead (CPL): Only if Ad Spend exists and leads exist
  let costPerLead: number | null = null;
  if (hasValue(totalAdSpend) && (totalAdSpend as number) > 0) {
    const paidLeads = (tk.adLeads || 0) + (fb.adLeads || 0);
    if (paidLeads > 0) {
      costPerLead = Math.round((totalAdSpend as number) / paidLeads);
    } else if (hasValue(totalLeads) && (totalLeads as number) > 0) {
      costPerLead = Math.round((totalAdSpend as number) / (totalLeads as number));
    }
  }

  // Cost per conversion
  let costPerConversion: number | null = null;
  if (hasValue(totalAdSpend) && (totalAdSpend as number) > 0) {
    const paidConversions = (tk.adConversions || 0) + (fb.adConversions || 0);
    if (paidConversions > 0) {
      costPerConversion = Math.round((totalAdSpend as number) / paidConversions);
    } else if (hasValue(totalConversions) && (totalConversions as number) > 0) {
      costPerConversion = Math.round((totalAdSpend as number) / (totalConversions as number));
    }
  }

  return {
    totalReach,
    totalViews,
    totalEngagement,
    totalLeads,
    qualifiedLeads,
    totalConversions,
    revenueGenerated,
    conversionRate,
    totalAdSpend,
    costPerLead,
    costPerConversion,
  };
}

export function calculateTiktokMetrics(tk: TiktokMetrics): CalculatedTiktokMetrics {
  const hasFollowers = hasValue(tk.followersStart) && hasValue(tk.followersEnd);
  const netFollowers = hasFollowers
    ? ((tk.followersEnd as number) - (tk.followersStart as number))
    : (hasValue(tk.newFollowers) ? (tk.newFollowers as number) : null);

  const followerGrowthRate = hasFollowers && (tk.followersStart as number) > 0 && hasValue(netFollowers)
    ? Number((((netFollowers as number) / (tk.followersStart as number)) * 100).toFixed(2))
    : null;

  const avgViewsPerVideo = hasValue(tk.videosPublished) && (tk.videosPublished as number) > 0 && hasValue(tk.totalViews)
    ? Math.round((tk.totalViews as number) / (tk.videosPublished as number))
    : null;

  const engVals = [tk.likes, tk.comments, tk.shares, tk.saves].filter(hasValue) as number[];
  const totalEngagement = engVals.length > 0 ? engVals.reduce((a, b) => a + b, 0) : null;

  const avgEngagementPerVideo = hasValue(tk.videosPublished) && (tk.videosPublished as number) > 0 && hasValue(totalEngagement)
    ? Math.round((totalEngagement as number) / (tk.videosPublished as number))
    : null;

  const baseReach = hasValue(tk.uniqueReach) ? (tk.uniqueReach as number) : (hasValue(tk.totalViews) ? (tk.totalViews as number) : null);
  const engagementRate = hasValue(totalEngagement) && hasValue(baseReach) && (baseReach as number) > 0
    ? Number((((totalEngagement as number) / (baseReach as number)) * 100).toFixed(2))
    : null;

  // Paid Ads: Only calculate when source data exists
  const ctr = hasValue(tk.adImpressions) && (tk.adImpressions as number) > 0 && hasValue(tk.adClicks)
    ? Number((((tk.adClicks as number) / (tk.adImpressions as number)) * 100).toFixed(2))
    : null;

  const cpc = hasValue(tk.adSpend) && hasValue(tk.adClicks) && (tk.adClicks as number) > 0
    ? Math.round((tk.adSpend as number) / (tk.adClicks as number))
    : null;

  const cpl = hasValue(tk.adSpend) && hasValue(tk.adLeads) && (tk.adLeads as number) > 0
    ? Math.round((tk.adSpend as number) / (tk.adLeads as number))
    : null;

  const costPerConversion = hasValue(tk.adSpend) && hasValue(tk.adConversions) && (tk.adConversions as number) > 0
    ? Math.round((tk.adSpend as number) / (tk.adConversions as number))
    : null;

  return {
    followerGrowthRate,
    avgViewsPerVideo,
    avgEngagementPerVideo,
    engagementRate,
    totalEngagement,
    ctr,
    cpc,
    cpl,
    costPerConversion,
  };
}

export function calculateFacebookMetrics(fb: FacebookMetrics): CalculatedFacebookMetrics {
  const hasFollowers = hasValue(fb.followersStart) && hasValue(fb.followersEnd);
  const netFollowers = hasFollowers
    ? ((fb.followersEnd as number) - (fb.followersStart as number))
    : (hasValue(fb.newFollowers) ? (fb.newFollowers as number) : null);

  const followerGrowthRate = hasFollowers && (fb.followersStart as number) > 0 && hasValue(netFollowers)
    ? Number((((netFollowers as number) / (fb.followersStart as number)) * 100).toFixed(2))
    : null;

  const engVals = [fb.likes, fb.comments, fb.shares, fb.linkClicks].filter(hasValue) as number[];
  const totalEngagement = hasValue(fb.postEngagements)
    ? (fb.postEngagements as number)
    : engVals.length > 0
    ? engVals.reduce((a, b) => a + b, 0)
    : null;

  const baseReach = hasValue(fb.reach) ? (fb.reach as number) : (hasValue(fb.impressions) ? (fb.impressions as number) : null);
  const engagementRate = hasValue(totalEngagement) && hasValue(baseReach) && (baseReach as number) > 0
    ? Number((((totalEngagement as number) / (baseReach as number)) * 100).toFixed(2))
    : null;

  const conversionRate = hasValue(fb.leads) && (fb.leads as number) > 0 && hasValue(fb.conversions)
    ? Number((((fb.conversions as number) / (fb.leads as number)) * 100).toFixed(2))
    : null;

  // Paid Ads
  const ctr = hasValue(fb.adImpressions) && (fb.adImpressions as number) > 0 && hasValue(fb.adLinkClicks)
    ? Number((((fb.adLinkClicks as number) / (fb.adImpressions as number)) * 100).toFixed(2))
    : null;

  const cpc = hasValue(fb.adSpend) && hasValue(fb.adLinkClicks) && (fb.adLinkClicks as number) > 0
    ? Math.round((fb.adSpend as number) / (fb.adLinkClicks as number))
    : null;

  const cpm = hasValue(fb.adSpend) && hasValue(fb.adImpressions) && (fb.adImpressions as number) > 0
    ? Math.round(((fb.adSpend as number) / (fb.adImpressions as number)) * 1000)
    : null;

  const cpl = hasValue(fb.adSpend) && hasValue(fb.adLeads) && (fb.adLeads as number) > 0
    ? Math.round((fb.adSpend as number) / (fb.adLeads as number))
    : null;

  const costPerConversion = hasValue(fb.adSpend) && hasValue(fb.adConversions) && (fb.adConversions as number) > 0
    ? Math.round((fb.adSpend as number) / (fb.adConversions as number))
    : null;

  return {
    followerGrowthRate,
    engagementRate,
    totalEngagement,
    conversionRate,
    ctr,
    cpc,
    cpm,
    cpl,
    costPerConversion,
  };
}

export function calculateWebsiteMetrics(web: WebsiteMetrics): CalculatedWebsiteMetrics {
  const leadConversionRate = hasValue(web.sessions) && (web.sessions as number) > 0 && hasValue(web.leads)
    ? Number((((web.leads as number) / (web.sessions as number)) * 100).toFixed(2))
    : null;

  const customerConversionRate = hasValue(web.leads) && (web.leads as number) > 0 && hasValue(web.conversions)
    ? Number((((web.conversions as number) / (web.leads as number)) * 100).toFixed(2))
    : null;

  const sessionConversionRate = hasValue(web.sessions) && (web.sessions as number) > 0 && hasValue(web.conversions)
    ? Number((((web.conversions as number) / (web.sessions as number)) * 100).toFixed(2))
    : null;

  return {
    leadConversionRate,
    customerConversionRate,
    sessionConversionRate,
    conversionRate: customerConversionRate, // Primary: Customers / Leads
    formattedDuration: formatDurationSeconds(web.avgSessionDurationSeconds),
  };
}

export function calculateMarketingFunnel(report: WeeklyMarketingReport): CalculatedFunnel {
  const kpis = calculateExecutiveKPIs(report);
  const webSessions = report.websiteMetrics?.sessions;
  const fbMessages = report.facebookMetrics?.messagesStarted;
  const webVisits = (hasValue(webSessions) || hasValue(fbMessages))
    ? ((webSessions || 0) + (fbMessages || 0))
    : null;

  const rawStages: { label: string; subLabel: string; count: number | null; description: string }[] = [
    {
      label: "Tiếp cận",
      subLabel: "Reach",
      count: kpis.totalReach,
      description: "Người dùng thấy thương hiệu HATICO trên mọi kênh",
    },
    {
      label: "Tương tác",
      subLabel: "Engagement",
      count: kpis.totalEngagement,
      description: "Lượt tương tác, thả tim, bình luận và chia sẻ",
    },
    {
      label: "Truy cập & Nhắn tin",
      subLabel: "Traffic / Inbox",
      count: webVisits,
      description: "Truy cập hatico.vn hoặc gửi tin nhắn Fanpage",
    },
    {
      label: "Khách tiềm năng",
      subLabel: "Leads",
      count: kpis.totalLeads,
      description: "Khách để lại số điện thoại hoặc form tư vấn",
    },
    {
      label: "Đủ điều kiện",
      subLabel: "Qualified",
      count: kpis.qualifiedLeads,
      description: "Khách có nhu cầu thực tế và đã nhận báo giá",
    },
    {
      label: "Chốt đơn",
      subLabel: "Customers",
      count: kpis.totalConversions,
      description: "Ký hợp đồng hoặc đặt cọc mua rơ mooc",
    },
  ];

  // ONLY retain stages that actually have data!
  const availableStages = rawStages.filter((s) => hasValue(s.count));

  // If fewer than 2 stages exist, hide the funnel completely
  if (availableStages.length < 2) {
    return { stages: [] };
  }

  const stages: FunnelStage[] = availableStages.map((st, i) => {
    let rateFromPrevious: number | undefined = undefined;
    if (i > 0) {
      const prevCount = availableStages[i - 1].count as number;
      const curCount = st.count as number;
      if (prevCount > 0) {
        rateFromPrevious = Number(((curCount / prevCount) * 100).toFixed(1));
      }
    }
    return {
      label: st.label,
      subLabel: st.subLabel,
      count: st.count as number,
      rateFromPrevious,
      description: st.description,
    };
  });

  return { stages };
}

export function compareMetrics(
  currentVal: number | null | undefined,
  prevVal: number | null | undefined,
  higherIsBetter = true
): { diffPercent: number; isGood: boolean; formattedDiff: string } | null {
  if (!hasValue(currentVal) || !hasValue(prevVal)) return null;
  const cur = currentVal as number;
  const prev = prevVal as number;

  if (prev === 0) {
    if (cur === 0) return { diffPercent: 0, isGood: true, formattedDiff: "0%" };
    return {
      diffPercent: cur > 0 ? 100 : -100,
      isGood: higherIsBetter ? cur > 0 : cur < 0,
      formattedDiff: cur > 0 ? "+100%" : "-100%",
    };
  }

  const diff = ((cur - prev) / prev) * 100;
  const isGood = higherIsBetter ? diff >= 0 : diff <= 0;
  const sign = diff > 0 ? "+" : "";
  return {
    diffPercent: Number(diff.toFixed(1)),
    isGood,
    formattedDiff: `${sign}${diff.toFixed(1)}%`,
  };
}

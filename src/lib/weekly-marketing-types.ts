export type ReportStatus = "not_created" | "draft" | "submitted" | "approved";

export interface TiktokMetrics {
  // Organic
  followersStart?: number | null;
  followersEnd?: number | null;
  newFollowers?: number | null;
  videosPublished?: number | null;
  totalViews?: number | null;
  uniqueReach?: number | null;
  profileViews?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  bestVideoTitle?: string | null;
  bestVideoViews?: number | null;
  bestVideoEngagement?: number | null;
  leads?: number | null;
  notes?: string | null;

  // Paid Ads
  adSpend?: number | null;
  adImpressions?: number | null;
  adReach?: number | null;
  adClicks?: number | null;
  adLeads?: number | null;
  adConversions?: number | null;
}

export interface FacebookMetrics {
  // Organic
  followersStart?: number | null;
  followersEnd?: number | null;
  newFollowers?: number | null;
  postsPublished?: number | null;
  reach?: number | null;
  impressions?: number | null;
  pageViews?: number | null;
  postEngagements?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  linkClicks?: number | null;
  messagesStarted?: number | null;
  leads?: number | null;
  qualifiedLeads?: number | null;
  conversions?: number | null;
  bestPostTitle?: string | null;

  // Paid Ads
  adSpend?: number | null;
  adReach?: number | null;
  adImpressions?: number | null;
  adFrequency?: number | null;
  adLinkClicks?: number | null;
  adLeads?: number | null;
  adConversions?: number | null;
}

export interface WebsiteLandingPage {
  path: string;
  title: string;
  views?: number | null;
  leads?: number | null;
}

export interface WebsiteTrafficSource {
  source: string;
  sessions?: number | null;
  leads?: number | null;
}

export interface WebsiteMetrics {
  totalUsers?: number | null;
  newUsers?: number | null;
  sessions?: number | null;
  pageViews?: number | null;
  avgSessionDurationSeconds?: number | null;
  bounceRate?: number | null; // percentage e.g. 42.5
  engagementRate?: number | null; // percentage e.g. 57.5

  // Traffic by source
  trafficOrganicSearch?: number | null;
  trafficFacebook?: number | null;
  trafficTiktok?: number | null;
  trafficDirect?: number | null;
  trafficReferral?: number | null;

  // Business conversions
  contactFormSubmissions?: number | null;
  phoneCallClicks?: number | null;
  zaloClicks?: number | null;
  quoteRequests?: number | null;
  leads?: number | null;
  qualifiedLeads?: number | null;
  conversions?: number | null;

  // Top rankings
  topLandingPages?: WebsiteLandingPage[];
  topTrafficSources?: WebsiteTrafficSource[];
  bestPerformingPage?: string | null;
}

export interface ChannelLeadRow {
  source: string;
  leads?: number | null;
  qualifiedLeads?: number | null;
  conversions?: number | null;
  adSpend?: number | null;
}

export interface LeadMetrics {
  totalLeads?: number | null;
  newLeads?: number | null;
  qualifiedLeads?: number | null;
  customersContacted?: number | null;
  quoteRequests?: number | null;
  quotationsSent?: number | null;
  convertedCustomers?: number | null;
  revenueGenerated?: number | null; // in VNĐ
  channelBreakdown?: ChannelLeadRow[];
}

export type ContentStatus = "Xuất sắc" | "Tốt" | "Trung bình" | "Cần cải thiện";
export type ContentPlatform = "TikTok" | "Facebook" | "Website" | "YouTube";

export interface ContentItem {
  id: string;
  platform: ContentPlatform;
  title: string;
  publishDate?: string | null; // YYYY-MM-DD
  contentType?: string | null; // "Video ngắn", "Hình ảnh", "Reel", "Bài viết SEO"
  viewsOrReach?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  leads?: number | null;
  status: ContentStatus;
  rank?: number | null; // 1, 2, 3 for top performing
  link?: string | null;
}

export interface WeeklyAnalysis {
  highlights?: string[];
  bestContentRationale?: string | null;
  issuesAndImprovements?: string[];
  nextWeekPlan?: string[];
  recommendations?: string[];
}

export interface WeeklyMarketingReport {
  reportId: string;
  weekNumber: number;
  year: number;
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string; // YYYY-MM-DD (Sunday)
  createdBy: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  status: ReportStatus;

  tiktokMetrics: TiktokMetrics;
  facebookMetrics: FacebookMetrics;
  websiteMetrics: WebsiteMetrics;
  leadMetrics: LeadMetrics;
  contentPerformance: ContentItem[];
  weeklyAnalysis: WeeklyAnalysis;
}

export interface WeeklyMarketingReportSummary {
  reportId: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  status: ReportStatus;
  submittedAt?: string;
  createdBy: string;
  totalReach?: number | null;
  totalLeads?: number | null;
  totalConversions?: number | null;
}

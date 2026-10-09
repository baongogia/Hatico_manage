export type PeriodicReportType = "weekly" | "monthly";
export type PeriodicReportStatus = "draft" | "closed";

export interface PeriodicEvaluation {
  highlightedResults: string;          // 1. Kết quả nổi bật
  issuesAndDifficulties: string;       // 2. Tồn tại và khó khăn
  proposalsAndRecommendations: string; // 3. Đề xuất và kiến nghị
}

export interface PeriodicActionPlanItem {
  id: string;
  task: string;      // Công việc
  target: string;    // Mục tiêu
  assignee: string;  // Người phụ trách
  deadline: string;  // Thời hạn
}

export interface PeriodicReportKPIs {
  totalContents: number;      // 1. Tổng bài viết/video đã đăng
  totalViews: number;         // 2. Tổng lượt xem
  totalInteractions: number;  // 3. Tổng lượt tương tác
  totalLeads: number;         // 4. Tổng khách hàng quan tâm
  totalConsulted: number;     // 5. Tổng khách hàng được tư vấn
  totalConverted: number;     // 6. Tổng khách hàng chuyển đổi thực tế
  totalOrders: number;        // 7. Tổng đơn hàng chốt thành công
  totalAdSpend: number;       // 8. Tổng chi phí quảng cáo
}

export interface KPICardComparison {
  current: number;
  previous: number | null;
  diff: number | null;
  percent: number | null; // e.g. +15.5 or -8.2
}

export interface ChannelResultRow {
  platform: "facebook" | "tiktok" | "youtube" | "website";
  platformName: string;
  contentCount: number;
  views: number;
  interactions: number | null; // Website = null ("—")
  leads: number;
  consulted: number;
  converted: number;
  orders: number;
}

export interface TopContentItem {
  id: string;
  title: string;
  platform: string;
  platformKey: "facebook" | "tiktok" | "youtube" | "website";
  publishDate: string;
  views: number;
  interactions: number;
  link?: string;
}

export interface AdCampaignDetailRow {
  id: string;
  name: string;
  branchName: string;
  cost: number;
  leads: number;
  consulted: number;
  orders: number;
  cpl: number | null;
}

export interface AdPlatformReport {
  platform: "facebook_ads" | "tiktok_ads";
  platformName: string;
  activeCampaignsCount: number;
  totalCost: number;
  leads: number;
  consulted: number;
  converted: number;
  orders: number;
  cpl: number | null;
  campaigns: AdCampaignDetailRow[];
}

export interface AdComparisonSummary {
  facebook: {
    cost: number;
    leads: number;
    consulted: number;
    converted: number;
    orders: number;
    cpl: number | null;
  };
  tiktok: {
    cost: number;
    leads: number;
    consulted: number;
    converted: number;
    orders: number;
    cpl: number | null;
  };
  total: {
    cost: number;
    leads: number;
    consulted: number;
    converted: number;
    orders: number;
    cpl: number | null;
  };
}

export interface BranchResultRow {
  branchId: string;
  branchName: string;
  contentCount: number;
  leads: number;
  consulted: number;
  converted: number;
  orders: number;
  adSpend: number;
}

export interface PeriodicReportDataSnapshot {
  kpis: PeriodicReportKPIs;
  prevKpis: PeriodicReportKPIs | null;
  kpiComparison: Record<keyof PeriodicReportKPIs, KPICardComparison>;
  channelResults: ChannelResultRow[];
  channelTotals: {
    contentCount: number;
    views: number;
    interactions: number;
    leads: number;
    consulted: number;
    converted: number;
    orders: number;
  };
  topContents: TopContentItem[];
  facebookAds: AdPlatformReport;
  tiktokAds: AdPlatformReport;
  adComparison: AdComparisonSummary;
  branchResults: BranchResultRow[];
  totalSystemBranch: BranchResultRow;
}

export interface ReportHistoryItem {
  timestamp: string;
  action: "created" | "updated" | "closed" | "reopened";
  userName: string;
  notes?: string;
}

export interface MarketingPeriodicReport {
  id: string;
  reportType: PeriodicReportType; // "weekly" | "monthly"
  year: number;
  periodNumber: number;          // Week 1-53 hoặc Month 1-12
  branchId: string;              // "all" hoặc branch UUID
  branchName: string;            // "Toàn hệ thống" hoặc tên chi nhánh
  startDate: string;             // YYYY-MM-DD
  endDate: string;               // YYYY-MM-DD
  creatorId?: string;
  creatorName: string;
  status: PeriodicReportStatus;  // "draft" | "closed"
  closedAt?: string;
  closedBy?: string;
  evaluation: PeriodicEvaluation;
  actionPlan: PeriodicActionPlanItem[];
  data: PeriodicReportDataSnapshot;
  isSnapshot: boolean;
  lastAggregatedAt: string;
  createdAt: string;
  updatedAt: string;
  history: ReportHistoryItem[];
}

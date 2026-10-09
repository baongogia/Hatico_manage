export type MarketingPlatform = "facebook" | "tiktok" | "youtube" | "website";
export type AdPlatform = "facebook_ads" | "tiktok_ads";
export type LeadSource =
  | "facebook_organic"
  | "facebook_ads"
  | "tiktok_organic"
  | "tiktok_ads"
  | "youtube"
  | "website";

export type LeadStatus =
  | "new"
  | "consulted"
  | "discussing"
  | "converted"
  | "closed"
  | "no_demand";

export type CampaignStatus = "preparing" | "running" | "paused" | "completed";

export const HATICO_BRANCHES = [
  { id: "e0462eae-7a2a-4e4d-a03b-ed9423871289", name: "Hatico Việt Nam – Tổng kho", shortCode: "HN" },
  { id: "a8a828f2-6338-45a5-afa8-2a4afa9ac4ae", name: "Hatico Tây Nguyên", shortCode: "TN" },
  { id: "186dcf21-63cd-4c17-a0d2-17c1eb67963b", name: "Hatico Đồng Nai", shortCode: "DN" },
  { id: "99d13168-c4e2-4d2a-958d-287c946a9deb", name: "Hatico Hoàng Mai", shortCode: "HM" },
  { id: "413402c0-e251-4b75-a3b8-631374422032", name: "Hatico Quảng Trị", shortCode: "QT" },
] as const;

export const HATICO_FANPAGES = [
  "Hatico Việt Nam – Tổng kho",
  "Hatico Tây Nguyên",
  "Hatico Đồng Nai",
  "Hatico Hoàng Mai",
  "Hatico Quảng Trị",
] as const;

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  facebook_organic: "Facebook Organic",
  facebook_ads: "Facebook Ads",
  tiktok_organic: "TikTok Organic",
  tiktok_ads: "TikTok Ads",
  youtube: "YouTube",
  website: "Website",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Mới quan tâm",
  consulted: "Đã tư vấn",
  discussing: "Đang trao đổi",
  converted: "Đã chuyển đổi",
  closed: "Đã chốt đơn",
  no_demand: "Không có nhu cầu",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  preparing: "Chuẩn bị",
  running: "Đang chạy",
  paused: "Tạm dừng",
  completed: "Hoàn thành",
};

export interface MarketingContentItem {
  id: string;
  platform: MarketingPlatform;
  publish_date: string;
  title: string;
  content_type: string; // "Bài viết", "Reels", "Video ngắn", "Video dài", "Shorts", "Bài website"
  topic?: string;
  link?: string;
  views: number;
  interactions: number;
  leads_count: number;
  consulted_count: number;
  converted_count: number;
  orders_count: number;
  branch_id?: string;
  fanpage_name?: string;
  author_id?: string;
  author_name?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MarketingCampaignItem {
  id: string;
  platform: AdPlatform;
  name: string;
  branch_id?: string;
  fanpage_name?: string;
  target_objective?: string;
  start_date: string;
  end_date?: string;
  budget: number;
  actual_cost: number;
  reach: number; // FB Ads tiếp cận
  views: number; // TikTok Ads lượt xem
  interactions: number;
  leads_count: number;
  consulted_count: number;
  converted_count: number;
  orders_count: number;
  status: CampaignStatus;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MarketingLeadItem {
  id: string;
  lead_date: string;
  full_name: string;
  phone: string;
  address?: string;
  demand?: string;
  source: LeadSource;
  campaign_id?: string;
  campaign_name?: string;
  branch_id?: string; // Chi nhánh tạo nguồn
  branch_name?: string;
  handler_branch_id?: string; // Chi nhánh tiếp nhận xử lý
  handler_branch_name?: string;
  assigned_staff_id?: string; // Nhân sự phụ trách
  assigned_staff_name?: string;
  status: LeadStatus;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MarketingFilter {
  dateRange: "today" | "7days" | "this_month" | "last_month" | "custom";
  startDate?: string;
  endDate?: string;
  branchId?: string; // 'all' or branch id
  channel?: "all" | "facebook" | "tiktok" | "youtube" | "website" | "ads";
}

export interface ExecutiveKPISummary {
  totalContents: number;
  totalViews: number;
  totalInteractions: number;
  totalLeads: number; // Tổng khách quan tâm
  totalConsulted: number; // Tổng khách được tư vấn
  totalConverted: number; // Tổng khách chuyển đổi
  totalOrders: number; // Tổng số đơn hàng chốt thành công
  totalAdCost: number; // Tổng chi phí quảng cáo
  
  // Previous period comparison (% change)
  prevTotalContents: number;
  prevTotalViews: number;
  prevTotalInteractions: number;
  prevTotalLeads: number;
  prevTotalConsulted: number;
  prevTotalConverted: number;
  prevTotalOrders: number;
  prevTotalAdCost: number;

  cpl: number | null; // Chi phí / Khách quan tâm (Ads)
  costPerOrder: number | null; // Chi phí / Đơn chốt (Ads)
}

export interface TrendDataPoint {
  date: string;
  displayDate: string;
  leads: number;
  consulted: number;
  orders: number;
}

export interface ChannelComparisonPoint {
  channel: string;
  leads: number;
  orders: number;
  views: number;
  interactions: number;
}

export interface AdPerformancePoint {
  channel: string;
  cost: number;
  leads: number;
  orders: number;
  cpl: number | null;
}

export interface BranchPerformanceRow {
  branchId: string;
  branchName: string;
  contentsCount: number;
  leadsCount: number;
  consultedCount: number;
  convertedCount: number;
  ordersCount: number;
  adCost: number;
  handledLeadsCount: number; // Khách được tiếp nhận xử lý
  handledOrdersCount: number; // Đơn được tiếp nhận chốt
}

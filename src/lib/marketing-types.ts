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
  { id: "e0462eae-7a2a-4e4d-a03b-ed9423871289", name: "Hatico Việt Nam – Tổng kho", shortCode: "HN", picName: "Ngô Gia Bảo" },
  { id: "a8a828f2-6338-45a5-afa8-2a4afa9ac4ae", name: "Hatico Tây Nguyên", shortCode: "TN", picName: "Võ Thành Trung" },
  { id: "186dcf21-63cd-4c17-a0d2-17c1eb67963b", name: "Hatico Đồng Nai", shortCode: "DN", picName: "Phạm Phương Thảo" },
  { id: "99d13168-c4e2-4d2a-958d-287c946a9deb", name: "Hatico Hoàng Mai", shortCode: "HM", picName: "Hồ Mạnh Hùng" },
  { id: "413402c0-e251-4b75-a3b8-631374422032", name: "Hatico Quảng Trị", shortCode: "QT", picName: "Nguyễn Quang Đồng" },
] as const;

export const HATICO_FANPAGES = [
  "Hatico Việt Nam – Tổng kho",
  "Hatico Tây Nguyên",
  "Hatico Đồng Nai",
  "Hatico Hoàng Mai",
  "Hatico Quảng Trị",
] as const;

export function getBranchPIC(branchId?: string, branchName?: string): string {
  if (branchId) {
    const b = HATICO_BRANCHES.find((item) => item.id === branchId);
    if (b) return b.picName;
  }
  const nameToTest = branchName || branchId;
  if (!nameToTest) return "Ngô Gia Bảo";

  const lower = nameToTest.toLowerCase();
  if (lower.includes("quảng trị")) return "Nguyễn Quang Đồng";
  if (lower.includes("đồng nai")) return "Phạm Phương Thảo";
  if (lower.includes("tây nguyên")) return "Võ Thành Trung";
  if (lower.includes("hoàng mai")) return "Hồ Mạnh Hùng";
  if (lower.includes("tổng kho") || lower.includes("việt nam")) return "Ngô Gia Bảo";

  return "Ngô Gia Bảo";
}


export function isPostInBranch(
  c: { branchId?: string; branchName?: string },
  targetBranchId: string
): boolean {
  if (targetBranchId === "all") return true;
  const targetBranch = HATICO_BRANCHES.find((b) => b.id === targetBranchId);
  if (!targetBranch) return false;

  // 1. Direct branchId match
  if (c.branchId && c.branchId === targetBranchId) return true;

  // 2. Direct or keyword match by branchName
  if (c.branchName) {
    if (c.branchName === targetBranch.name) return true;
    const bNameLower = targetBranch.name.toLowerCase();
    const cNameLower = c.branchName.toLowerCase();
    if (bNameLower.includes("tây nguyên") && cNameLower.includes("tây nguyên")) return true;
    if (bNameLower.includes("hoàng mai") && cNameLower.includes("hoàng mai")) return true;
    if (bNameLower.includes("đồng nai") && cNameLower.includes("đồng nai")) return true;
    if (bNameLower.includes("quảng trị") && cNameLower.includes("quảng trị")) return true;
    if (bNameLower.includes("tổng kho") && (cNameLower.includes("tổng kho") || cNameLower.includes("việt nam"))) return true;
    return false;
  }

  // 3. Fallback to Tổng kho only if post has neither branchId nor branchName
  if (!c.branchId && !c.branchName && targetBranch.id === HATICO_BRANCHES[0].id) {
    return true;
  }

  return false;
}

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
  platform_raw?: string; // Ví dụ "Tiktok, Facebook" nếu đa nền tảng
  platforms?: string[]; // Mảng các nền tảng ["tiktok", "facebook"]
  publish_date: string;
  title: string;
  content_type: string; // "Bài viết", "Reels", "Video ngắn", "Video dài", "Shorts", "Bài website"
  topic?: string;
  link?: string;
  views: number;
  interactions: number;
  likes?: number;
  comments?: number;
  shares?: number;
  leads_count: number;
  consulted_count: number;
  converted_count: number;
  orders_count: number;
  branch_id?: string;
  fanpage_name?: string;
  author_id?: string;
  author_name?: string;
  status?: "completed" | "in_progress" | "pending";
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
  cpl?: number | null; // CPL thực tế (Cost Per Lead)
  cost_per_order?: number | null; // Chi phí / đơn hàng chốt
  status: CampaignStatus;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LeadStatusHistoryEntry {
  status: LeadStatus;
  changed_at: string;
  note?: string;
}

export interface MarketingLeadItem {
  id: string;
  lead_date: string;
  full_name: string;
  phone: string;
  address?: string;
  demand?: string;
  source: LeadSource;
  source_type?: "organic" | "ads";
  campaign_id?: string;
  campaign_name?: string;
  content_id?: string; // ID bài viết / video tạo nguồn
  content_title?: string;
  branch_id?: string; // Chi nhánh tạo nguồn
  branch_name?: string;
  handler_branch_id?: string; // Chi nhánh tiếp nhận xử lý
  handler_branch_name?: string;
  assigned_staff_id?: string; // Nhân sự phụ trách
  assigned_staff_name?: string;
  status: LeadStatus;
  consulted_at?: string; // Thời điểm tư vấn
  converted_at?: string; // Thời điểm chuyển đổi
  closed_at?: string; // Thời điểm chốt đơn
  order_id?: string; // Mã đơn hàng / Hợp đồng thực tế
  status_history?: LeadStatusHistoryEntry[];
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

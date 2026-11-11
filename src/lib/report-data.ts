export interface TaskItem {
  type?: "task";
  title: string;
  progress: string;
  status: "completed" | "in_progress" | "pending";
}

export type CallOutcome =
  | "no_answer"
  | "follow_up"
  | "interested"
  | "quote_sent"
  | "closed"
  | string;

export interface CallReportEntry {
  type: "call";
  id?: string;
  customer_name: string;
  phone: string;
  province: string;
  trailer_type: string;
  price_quote: string;
  post_call_notes: string;
  result?: CallOutcome;
  follow_up_date?: string;
}

export interface SalesPostActivity {
  type: "post";
  id?: string;
  platform: string; // e.g. Facebook, Zalo, TikTok, Chợ Tốt...
  quantity: number; // default 1
  link_or_desc?: string;
  inquiries_count?: number; // optional: inquiries generated / inbox
  additional_links?: string;
}

export interface OtherWorkActivity {
  type: "other_task";
  id?: string;
  task_name: string;
  status: "completed" | "in_progress" | "pending";
  customer_name?: string;
  result_obstacle?: string;
  due_date?: string;
}

export interface MarketVisitActivity {
  type: "visit";
  id?: string;
  location_customer: string; // area or customer visited
  outcome: string; // short outcome
  customers_visited_count?: number; // default 1
  next_action?: string;
  expenses?: string;
}

export interface DailySummaryActivity {
  type: "daily_summary";
  summary: string;
  closed_orders?: number;
  contract_value?: string;
}

export type WorkActivityItem =
  | CallReportEntry
  | SalesPostActivity
  | OtherWorkActivity
  | MarketVisitActivity;

export interface MarketingPostEntry {
  type: "marketing_post";
  id?: string;
  platform: string;
  title: string;
  link: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  status: "completed" | "in_progress" | "pending";
  topic?: string;
  content_type?: string;
  branch_id?: string;
  author_id?: string;
}

export interface MarketingEventEntry {
  type: "marketing_event";
  event_name: string;
  event_date: string;
  trailer_type?: string;
  qty?: string;
  location?: string;
  budget: string;
  attendees: string;
  outcome: string;
  status: "completed" | "in_progress" | "pending";
}

export type ReportDataItem =
  | TaskItem
  | CallReportEntry
  | MarketingPostEntry
  | MarketingEventEntry
  | SalesPostActivity
  | OtherWorkActivity
  | MarketVisitActivity
  | DailySummaryActivity;

export interface CallReportRow extends CallReportEntry {
  report_date: string;
  report_id: string;
}

export interface WorkReportTotals {
  customerContacts: number;
  postsCount: number;
  completedTasks: number;
  visitTrips: number;
  customersVisited: number;
  closedOrders: number;
}

export interface MarketingPostRow extends MarketingPostEntry {
  report_date: string;
  report_id: string;
  author_name?: string;
}

export interface MarketingEventRow extends MarketingEventEntry {
  report_date: string;
  report_id: string;
  author_name?: string;
}

export type CallReportPeriod = "week" | "month" | "all";

export function isCallEntry(item: ReportDataItem): item is CallReportEntry {
  return item.type === "call";
}

export function isSalesPostActivity(item: ReportDataItem): item is SalesPostActivity {
  return item.type === "post";
}

export function isOtherWorkActivity(item: ReportDataItem): item is OtherWorkActivity {
  return item.type === "other_task";
}

export function isMarketVisitActivity(item: ReportDataItem): item is MarketVisitActivity {
  return item.type === "visit";
}

export function isDailySummaryActivity(item: ReportDataItem): item is DailySummaryActivity {
  return item.type === "daily_summary";
}

export function splitWorkReportItems(items: ReportDataItem[] = []) {
  const calls: CallReportEntry[] = [];
  const posts: SalesPostActivity[] = [];
  const otherTasks: OtherWorkActivity[] = [];
  const visits: MarketVisitActivity[] = [];
  let summary: DailySummaryActivity | null = null;
  const legacyNonWork: ReportDataItem[] = [];

  for (const item of items) {
    if (isCallEntry(item)) {
      calls.push(item);
    } else if (isSalesPostActivity(item)) {
      posts.push(item);
    } else if (isOtherWorkActivity(item)) {
      otherTasks.push(item);
    } else if (isMarketVisitActivity(item)) {
      visits.push(item);
    } else if (isDailySummaryActivity(item)) {
      summary = item;
    } else if (!item.type || item.type === "task") {
      const t = item as TaskItem;
      const titleLower = (t.title || "").toLowerCase();
      if (
        titleLower &&
        !titleLower.includes("điểm danh") &&
        !titleLower.startsWith("nghỉ:") &&
        !titleLower.startsWith("muộn:")
      ) {
        otherTasks.push({
          type: "other_task",
          task_name: t.title.replace(/\s*\(Admin\s*đánh\s*dấu\)/gi, "").trim(),
          status: t.status || "completed",
          result_obstacle: t.progress || "",
        });
      } else {
        legacyNonWork.push(item);
      }
    } else {
      legacyNonWork.push(item);
    }
  }

  return { calls, posts, otherTasks, visits, summary, legacyNonWork };
}

export function calculateWorkReportTotals(activities: {
  calls?: CallReportEntry[];
  posts?: SalesPostActivity[];
  otherTasks?: OtherWorkActivity[];
  visits?: MarketVisitActivity[];
  summary?: DailySummaryActivity | null;
}): WorkReportTotals {
  const calls = activities.calls || [];
  const posts = activities.posts || [];
  const otherTasks = activities.otherTasks || [];
  const visits = activities.visits || [];
  const summary = activities.summary;

  const customerContacts = calls.length;
  const postsCount = posts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const completedTasks = otherTasks.filter((t) => t.status === "completed").length;
  const visitTrips = visits.length;
  const customersVisited = visits.reduce((sum, v) => {
    const val = v.customers_visited_count;
    const num = val != null && !isNaN(Number(val)) ? Number(val) : 1;
    return sum + (num > 0 ? num : 1);
  }, 0);

  const closedFromCalls = calls.filter((c) => {
    const res = (c.result || "").toLowerCase();
    const notes = (c.post_call_notes || "").toLowerCase();
    return (
      res === "closed" ||
      res.includes("chốt") ||
      res.includes("cọc") ||
      notes.includes("chốt đơn") ||
      notes.includes("đặt cọc")
    );
  }).length;
  const closedFromSummary = Number(summary?.closed_orders) || 0;
  const closedOrders = closedFromCalls + closedFromSummary;

  return {
    customerContacts,
    postsCount,
    completedTasks,
    visitTrips,
    customersVisited,
    closedOrders,
  };
}

export function isMarketingPostEntry(item: ReportDataItem): item is MarketingPostEntry {
  return item.type === "marketing_post";
}

export function isMarketingEventEntry(item: ReportDataItem): item is MarketingEventEntry {
  return item.type === "marketing_event";
}

export function splitReportItems(items: ReportDataItem[] = []) {
  const calls: CallReportEntry[] = [];
  const marketingPosts: MarketingPostEntry[] = [];
  const marketingEvents: MarketingEventEntry[] = [];
  const tasks: TaskItem[] = [];
  for (const item of items) {
    if (isCallEntry(item)) {
      calls.push(item);
    } else if (isMarketingPostEntry(item)) {
      marketingPosts.push(item);
    } else if (isMarketingEventEntry(item)) {
      marketingEvents.push(item);
    } else {
      const taskItem = { ...item } as TaskItem;
      if (taskItem.title) {
        taskItem.title = taskItem.title.replace(/\s*\(Admin\s*đánh\s*dấu\)/gi, "").trim();
      }
      const titleLower = taskItem.title ? taskItem.title.toLowerCase() : "";
      if (taskItem.title && titleLower !== "điểm danh" && !titleLower.startsWith("nghỉ:") && !titleLower.startsWith("muộn:")) {
        tasks.push(taskItem);
      }
    }
  }
  return { calls, marketingPosts, marketingEvents, tasks };
}

export function hasWorkTasks(items: ReportDataItem[] = []) {
  return splitReportItems(items).tasks.some((t) => t.title.trim());
}

export function getPeriodStartDate(period: CallReportPeriod) {
  const now = new Date();
  if (period === "all") return null;
  const start = new Date(now);
  if (period === "week") {
    start.setDate(start.getDate() - 7);
  } else if (period === "month") {
    // Get from the 1st day of the previous month to ensure 
    // we have the complete data for the previous month
    start.setMonth(start.getMonth() - 1);
    start.setDate(1);
  }
  return start.toISOString().split("T")[0];
}

export function isSalesDepartment(departmentName?: string) {
  return departmentName === "Kinh doanh";
}

export function isMarketingDepartment(departmentName?: string) {
  if (!departmentName) return false;
  const name = departmentName.toLowerCase();
  return name.includes("marketing") || name.includes("truyền thông") || name.includes("mkt");
}


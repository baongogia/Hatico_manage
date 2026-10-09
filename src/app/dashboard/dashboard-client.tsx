"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  getAdminDashboardData,
  DailyReport,
  Profile,
  AdminDashboardData,
  CallReportRow,
} from "../actions";
import { isSalesDepartment, isMarketingDepartment } from "@/lib/report-data";
import { AdminSummarySkeleton } from "./admin-summary-skeleton";
import { MarketingShell, MainDashboardView } from "./marketing/marketing-shell";

// Dynamic sub-panels for peak performance
const AdminSummaryPanel = dynamic(
  () => import("./admin-summary-panel").then((m) => m.AdminSummaryPanel),
  { loading: () => <AdminSummarySkeleton /> },
);

const AdminAttendancePanel = dynamic(
  () => import("./admin-attendance-panel").then((m) => m.AdminAttendancePanel),
  { loading: () => <AdminSummarySkeleton /> },
);

const MarketingReportPanel = dynamic(
  () => import("./marketing-report-panel").then((m) => m.MarketingReportPanel),
  { loading: () => <AdminSummarySkeleton /> },
);

const WeeklyMarketingPanel = dynamic(
  () => import("./weekly-marketing/weekly-marketing-panel").then((m) => m.WeeklyMarketingPanel),
  { loading: () => <AdminSummarySkeleton /> },
);

const CallReportPanel = dynamic(
  () => import("./call-report-panel").then((m) => m.CallReportPanel),
  { loading: () => <AdminSummarySkeleton /> },
);

// Marketing channels and features
import { MarketingOverview } from "./marketing/overview/marketing-overview";
import { ChannelReportPanel } from "./marketing/channel/channel-report-panel";
import { CampaignPanel } from "./marketing/campaigns/campaign-panel";
import { LeadsPanel } from "./marketing/leads/leads-panel";
import { BranchesPanel } from "./marketing/branches/branches-panel";

interface DashboardClientProps {
  initialData: {
    role: string;
    profile: Profile;
    reports?: DailyReport[];
    callReports?: CallReportRow[];
    employees?: Profile[];
    date?: string;
  };
  initialTab?: string;
  initialAdminData?: AdminDashboardData | null;
  notice?: string;
}

const NOTICE_MESSAGES: Record<string, { title: string; message: string }> = {
  submitted: {
    title: "Gửi báo cáo thành công",
    message: "Báo cáo của bạn đã được lưu vào hệ thống.",
  },
};

export default function DashboardClient({
  initialData,
  initialTab,
  initialAdminData = null,
  notice,
}: DashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { role, profile, callReports = [] } = initialData;
  const isAdmin = role === "admin";
  const isMarketing = isMarketingDepartment(profile.department?.name);

  // Map incoming tab/view to valid MainDashboardView
  const resolveView = (tab?: string): MainDashboardView => {
    if (!tab) {
      return isAdmin ? "overview" : (isMarketing ? "posts" : "weekly");
    }
    if (tab === "marketing") return "posts";
    if (tab === "work") return "weekly";
    return tab as MainDashboardView;
  };

  const [activeView, setActiveView] = useState<MainDashboardView>(() => resolveView(initialTab));
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(initialAdminData);
  const [adminLoading, startAdminLoad] = useTransition();

  // Prefetch admin data if on admin view
  useEffect(() => {
    if (!isAdmin || adminData) return;
    const prefetch = () => {
      getAdminDashboardData().then((result) => {
        if (!("error" in result)) setAdminData(result);
      });
    };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(prefetch, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(prefetch, 500);
    return () => window.clearTimeout(t);
  }, [isAdmin, adminData]);

  // Lazy load admin data when switching to attendance or summary
  const handleViewChange = useCallback(
    (view: MainDashboardView) => {
      setActiveView(view);
      const url = view === "overview" ? "/dashboard" : `/dashboard?view=${view}`;
      window.history.replaceState(null, "", url);

      if ((view === "attendance" || view === "summary") && !adminData) {
        startAdminLoad(async () => {
          const result = await getAdminDashboardData();
          if (!("error" in result)) setAdminData(result);
        });
      }
    },
    [adminData],
  );

  // Custom Alert Modal state
  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({
    show: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    if (!notice || !NOTICE_MESSAGES[notice]) return;

    const { title, message } = NOTICE_MESSAGES[notice];
    setTimeout(() => {
      setAlertModal({ show: true, title, message });
    }, 0);
    window.history.replaceState(null, "", "/dashboard");
  }, [notice]);

  // Handle data reload
  const handleReload = () => {
    startTransition(() => {
      if (isAdmin && (activeView === "attendance" || activeView === "summary")) {
        getAdminDashboardData().then((result) => {
          if (!("error" in result)) setAdminData(result);
        });
      }
      router.refresh();
    });
  };

  return (
    <MarketingShell
      profile={profile}
      activeView={activeView}
      onViewChange={handleViewChange}
      onReload={handleReload}
      isPending={isPending || adminLoading}
    >
      {/* 1. Báo cáo điểm danh */}
      {activeView === "attendance" && (
        adminLoading && !adminData ? (
          <AdminSummarySkeleton />
        ) : adminData ? (
          <AdminAttendancePanel initialData={adminData} onDataUpdate={setAdminData} />
        ) : (
          <AdminSummarySkeleton />
        )
      )}

      {/* 2. Báo cáo bài đăng (đồng bộ từ tab cũ sang UI mới) */}
      {activeView === "posts" && <MarketingReportPanel profile={profile} />}

      {/* 3. Báo cáo Marketing tuần */}
      {activeView === "weekly" && <WeeklyMarketingPanel profile={profile} />}

      {/* 4. Báo cáo cuộc gọi */}
      {activeView === "calls" && (
        <CallReportPanel profile={profile} initialCalls={callReports} />
      )}

      {/* 5. Báo cáo tổng hợp */}
      {activeView === "summary" && (
        adminLoading && !adminData ? (
          <AdminSummarySkeleton />
        ) : adminData ? (
          <AdminSummaryPanel initialData={adminData} onDataUpdate={setAdminData} />
        ) : (
          <AdminSummarySkeleton />
        )
      )}

      {/* 6. Phân hệ Marketing: Tổng quan đa kênh */}
      {activeView === "overview" && <MarketingOverview />}

      {/* 7. Phân hệ Marketing: Khách hàng Marketing tập trung */}
      {activeView === "leads" && <LeadsPanel />}

      {/* 8. Kênh mạng xã hội & Website */}
      {activeView === "facebook" && (
        <ChannelReportPanel platform="facebook" title="Báo cáo Facebook" />
      )}
      {activeView === "tiktok" && (
        <ChannelReportPanel platform="tiktok" title="Báo cáo TikTok" />
      )}
      {activeView === "youtube" && (
        <ChannelReportPanel platform="youtube" title="Báo cáo YouTube" />
      )}
      {activeView === "website" && (
        <ChannelReportPanel platform="website" title="Báo cáo Website" />
      )}

      {/* 9. Chiến dịch quảng cáo Ads */}
      {activeView === "facebook_ads" && (
        <CampaignPanel platform="facebook_ads" title="Chiến dịch Facebook Ads" />
      )}
      {activeView === "tiktok_ads" && (
        <CampaignPanel platform="tiktok_ads" title="Chiến dịch TikTok Ads" />
      )}

      {/* 10. Phân tích chi nhánh */}
      {activeView === "branches" && <BranchesPanel />}

      {/* Custom Notification Modal */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 no-print">
          <div className="bg-white p-4 rounded-[4px] shadow-xl max-w-xs w-full space-y-3 animate-slide-in">
            <h3 className="font-bold text-slate-800 text-sm">
              {alertModal.title}
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              {alertModal.message}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setAlertModal({ show: false, title: "", message: "" })
                }
                className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-3.5 py-1.5 rounded-[4px] cursor-pointer transition-colors"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </MarketingShell>
  );
}

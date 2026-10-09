import { getSessionUser, getDashboardData, getAdminDashboardData } from "../actions";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";
import { isMarketingDepartment } from "@/lib/report-data";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-700">
        Không thể tải thông tin quản trị viên.
      </div>
    );
  }
  const resolvedParams = await searchParams;
  const dateStr = typeof resolvedParams.date === "string" ? resolvedParams.date : undefined;
  const notice = typeof resolvedParams.notice === "string" ? resolvedParams.notice : undefined;

  const data = await getDashboardData(dateStr, user);
  if ("error" in data) {
    console.error("Dashboard data load error:", data.error);
    return (
      <div className="flex h-screen items-center justify-center text-slate-700">
        Đã xảy ra lỗi khi tải dữ liệu: {data.error}
      </div>
    );
  }

  const viewStr = typeof resolvedParams.view === "string" ? resolvedParams.view : undefined;
  const validMarketingViews = [
    "overview",
    "facebook",
    "tiktok",
    "youtube",
    "website",
    "facebook_ads",
    "tiktok_ads",
    "leads",
    "branches",
  ];

  const initialTab =
    viewStr === "summary"
      ? "summary"
      : viewStr === "attendance"
        ? "attendance"
        : viewStr === "marketing" || viewStr === "posts"
          ? "posts"
          : viewStr === "calls"
            ? "calls"
            : viewStr === "work" || viewStr === "weekly"
              ? "weekly"
              : viewStr && validMarketingViews.includes(viewStr)
                ? viewStr
                : data.role === "admin"
                  ? "overview"
                  : isMarketingDepartment(data.profile?.department?.name)
                    ? "posts"
                    : "weekly";

  let initialAdminData = null;
  if (initialTab === "summary" || initialTab === "attendance") {
    const adminData = await getAdminDashboardData(dateStr, user);
    if (!("error" in adminData)) {
      initialAdminData = adminData;
    }
  }

  return (
    <DashboardClient
      initialData={data}
      initialTab={initialTab}
      initialAdminData={initialAdminData}
      notice={notice}
    />
  );
}

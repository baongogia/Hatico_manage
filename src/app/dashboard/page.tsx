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
    redirect("/login");
  }
  const resolvedParams = await searchParams;
  const dateStr = typeof resolvedParams.date === "string" ? resolvedParams.date : undefined;
  const notice = typeof resolvedParams.notice === "string" ? resolvedParams.notice : undefined;

  const data = await getDashboardData(dateStr, user);
  if ("error" in data) {
    console.error("Dashboard data load error:", data.error);
    redirect("/login");
  }

  const initialTab =
    resolvedParams.view === "summary"
      ? "summary"
      : resolvedParams.view === "attendance"
        ? "attendance"
        : resolvedParams.view === "marketing"
          ? "marketing"
          : resolvedParams.view === "calls"
            ? "calls"
            : resolvedParams.view === "work"
              ? "work"
              : data.role === "admin"
                ? "attendance"
                : isMarketingDepartment(data.profile?.department?.name)
                  ? "marketing"
                  : "work";

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

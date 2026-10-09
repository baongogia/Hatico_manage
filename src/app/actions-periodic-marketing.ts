"use server";

import { getSessionUser } from "./actions";
import {
  PeriodicReportType,
  MarketingPeriodicReport,
} from "@/lib/periodic-marketing-types";
import {
  fetchPeriodicReports,
  createOrGetPeriodicReport,
  savePeriodicReportDraft,
  refreshPeriodicReportData,
  closePeriodicReport,
  reopenPeriodicReport,
  deletePeriodicReport,
} from "@/lib/periodic-marketing-storage";

export async function fetchPeriodicReportsAction(
  reportType?: PeriodicReportType,
  year?: number,
  branchId?: string
) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Chưa đăng nhập!" };

    const reports = await fetchPeriodicReports(reportType, year, branchId);
    return { success: true, reports };
  } catch (err: any) {
    console.error("fetchPeriodicReportsAction error:", err);
    return { error: err.message || "Lỗi khi tải danh sách báo cáo" };
  }
}

export async function createOrGetPeriodicReportAction(
  reportType: PeriodicReportType,
  periodNumber: number,
  year: number,
  branchId: string = "all"
) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Chưa đăng nhập!" };

    const report = await createOrGetPeriodicReport(
      reportType,
      periodNumber,
      year,
      branchId,
      user.full_name,
      user.id
    );
    return { success: true, report };
  } catch (err: any) {
    console.error("createOrGetPeriodicReportAction error:", err);
    return { error: err.message || "Lỗi khi tạo báo cáo" };
  }
}

export async function savePeriodicReportDraftAction(report: MarketingPeriodicReport) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Chưa đăng nhập!" };

    const updated = await savePeriodicReportDraft(report, user.full_name);
    return { success: true, report: updated };
  } catch (err: any) {
    console.error("savePeriodicReportDraftAction error:", err);
    return { error: err.message || "Lỗi khi lưu bản nháp báo cáo" };
  }
}

export async function refreshPeriodicReportDataAction(reportId: string) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Chưa đăng nhập!" };

    const updated = await refreshPeriodicReportData(reportId, user.full_name);
    return { success: true, report: updated };
  } catch (err: any) {
    console.error("refreshPeriodicReportDataAction error:", err);
    return { error: err.message || "Lỗi khi cập nhật số liệu báo cáo" };
  }
}

export async function closePeriodicReportAction(reportId: string) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Chưa đăng nhập!" };

    const updated = await closePeriodicReport(reportId, user.full_name);
    return { success: true, report: updated };
  } catch (err: any) {
    console.error("closePeriodicReportAction error:", err);
    return { error: err.message || "Lỗi khi chốt báo cáo" };
  }
}

export async function reopenPeriodicReportAction(reportId: string, notes?: string) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Chưa đăng nhập!" };
    if (user.role !== "admin") {
      return { error: "Chỉ quản trị viên mới có quyền mở lại báo cáo đã chốt!" };
    }

    const updated = await reopenPeriodicReport(reportId, user.full_name, notes);
    return { success: true, report: updated };
  } catch (err: any) {
    console.error("reopenPeriodicReportAction error:", err);
    return { error: err.message || "Lỗi khi mở lại báo cáo" };
  }
}

export async function deletePeriodicReportAction(reportId: string) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Chưa đăng nhập!" };

    await deletePeriodicReport(reportId);
    return { success: true };
  } catch (err: any) {
    console.error("deletePeriodicReportAction error:", err);
    return { error: err.message || "Lỗi khi xóa báo cáo" };
  }
}


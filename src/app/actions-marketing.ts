"use server";

import { getSessionUser } from "./actions";
import {
  MarketingContentItem,
  MarketingCampaignItem,
  MarketingLeadItem,
  MarketingFilter,
  MarketingPlatform,
  AdPlatform,
} from "@/lib/marketing-types";
import {
  calculateMarketingDashboardMetrics,
  fetchMarketingContents,
  upsertMarketingContent,
  deleteMarketingContentById,
  fetchMarketingCampaigns,
  upsertMarketingCampaign,
  deleteMarketingCampaignById,
  fetchMarketingLeads,
  upsertMarketingLead,
  deleteMarketingLeadById,
  checkPhoneDuplicate,
} from "@/lib/marketing-db";
import { isMarketingDepartment } from "@/lib/report-data";

// ==============================================================================
// PERMISSION CHECKS & HELPERS
// ==============================================================================

async function verifyMarketingUser() {
  const profile = await getSessionUser();
  if (!profile) return null;

  const isAdmin = profile.role === "admin";
  const isMarketing = isMarketingDepartment(profile.department?.name);
  const branchId = profile.department?.branch_id;

  return {
    profile,
    isAdmin,
    isMarketing,
    branchId,
    canManage: isAdmin || isMarketing,
  };
}

function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  const start = phone.slice(0, 3);
  const end = phone.slice(-3);
  return `${start}***${end}`;
}

// ==============================================================================
// SERVER ACTIONS
// ==============================================================================

export async function getMarketingDashboardAction(filter: MarketingFilter) {
  const auth = await verifyMarketingUser();
  if (!auth) return { error: "Bạn chưa đăng nhập hoặc không có quyền truy cập." };

  try {
    const data = await calculateMarketingDashboardMetrics(filter);
    return { data };
  } catch (err: any) {
    console.error("Error in getMarketingDashboardAction:", err);
    return { error: err?.message || "Không thể tải số liệu Marketing." };
  }
}

export async function getMarketingContentsAction(
  platform?: MarketingPlatform,
  branchId?: string,
  startDate?: string,
  endDate?: string
) {
  const auth = await verifyMarketingUser();
  if (!auth) return { error: "Unauthorized" };

  try {
    const items = await fetchMarketingContents(platform, branchId, startDate, endDate);
    return { data: items };
  } catch (err: any) {
    console.error("Error in getMarketingContentsAction:", err);
    return { error: err?.message || "Không thể tải danh sách nội dung." };
  }
}

export async function saveMarketingContentAction(item: MarketingContentItem) {
  const auth = await verifyMarketingUser();
  if (!auth) return { error: "Unauthorized" };

  if (!item.title.trim()) {
    return { error: "Tiêu đề nội dung không được để trống." };
  }

  try {
    const saved = await upsertMarketingContent(item, auth.profile.id);
    return { data: saved };
  } catch (err: any) {
    console.error("Error in saveMarketingContentAction:", err);
    return { error: err?.message || "Không thể lưu nội dung." };
  }
}

export async function deleteMarketingContentAction(id: string) {
  const auth = await verifyMarketingUser();
  if (!auth) return { error: "Unauthorized" };

  try {
    await deleteMarketingContentById(id, auth.profile.id);
    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteMarketingContentAction:", err);
    return { error: err?.message || "Không thể xóa nội dung." };
  }
}

export async function getMarketingCampaignsAction(
  platform?: AdPlatform,
  branchId?: string,
  startDate?: string,
  endDate?: string
) {
  const auth = await verifyMarketingUser();
  if (!auth) return { error: "Unauthorized" };

  try {
    const items = await fetchMarketingCampaigns(platform, branchId, startDate, endDate);
    return { data: items };
  } catch (err: any) {
    console.error("Error in getMarketingCampaignsAction:", err);
    return { error: err?.message || "Không thể tải danh sách chiến dịch." };
  }
}

export async function saveMarketingCampaignAction(item: MarketingCampaignItem) {
  const auth = await verifyMarketingUser();
  if (!auth) return { error: "Unauthorized" };

  if (!item.name.trim()) {
    return { error: "Tên chiến dịch không được để trống." };
  }

  try {
    const saved = await upsertMarketingCampaign(item, auth.profile.id);
    return { data: saved };
  } catch (err: any) {
    console.error("Error in saveMarketingCampaignAction:", err);
    return { error: err?.message || "Không thể lưu chiến dịch." };
  }
}

export async function deleteMarketingCampaignAction(id: string) {
  const auth = await verifyMarketingUser();
  if (!auth) return { error: "Unauthorized" };

  try {
    await deleteMarketingCampaignById(id, auth.profile.id);
    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteMarketingCampaignAction:", err);
    return { error: err?.message || "Không thể xóa chiến dịch." };
  }
}

export async function getMarketingLeadsAction(
  source?: string,
  branchId?: string,
  startDate?: string,
  endDate?: string,
  search?: string
) {
  const auth = await verifyMarketingUser();
  if (!auth) return { error: "Unauthorized" };

  try {
    const items = await fetchMarketingLeads(source, branchId, startDate, endDate, search);
    
    // Privacy protection: If user is not admin or marketing lead, mask phone numbers
    const canViewFullPhone = auth.isAdmin || auth.isMarketing;
    const sanitized = items.map((l) => ({
      ...l,
      phone: canViewFullPhone ? l.phone : maskPhoneNumber(l.phone),
    }));

    return { data: sanitized, canViewFullPhone };
  } catch (err: any) {
    console.error("Error in getMarketingLeadsAction:", err);
    return { error: err?.message || "Không thể tải danh sách khách hàng." };
  }
}

export async function saveMarketingLeadAction(item: MarketingLeadItem) {
  const auth = await verifyMarketingUser();
  if (!auth) return { error: "Unauthorized" };

  if (!item.full_name.trim()) {
    return { error: "Họ tên khách hàng không được để trống." };
  }
  if (!item.phone.trim()) {
    return { error: "Số điện thoại không được để trống." };
  }

  try {
    const saved = await upsertMarketingLead(item, auth.profile.id);
    return { data: saved };
  } catch (err: any) {
    console.error("Error in saveMarketingLeadAction:", err);
    return { error: err?.message || "Không thể lưu khách hàng." };
  }
}

export async function deleteMarketingLeadAction(id: string) {
  const auth = await verifyMarketingUser();
  if (!auth) return { error: "Unauthorized" };

  try {
    await deleteMarketingLeadById(id);
    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteMarketingLeadAction:", err);
    return { error: err?.message || "Không thể xóa khách hàng." };
  }
}

export async function checkDuplicateLeadAction(phone: string, currentLeadId?: string) {
  const auth = await verifyMarketingUser();
  if (!auth) return { error: "Unauthorized" };

  try {
    const dup = await checkPhoneDuplicate(phone, currentLeadId);
    if (dup) {
      return {
        isDuplicate: true,
        existingLead: {
          id: dup.id,
          full_name: dup.full_name,
          phone: auth.isAdmin || auth.isMarketing ? dup.phone : maskPhoneNumber(dup.phone),
          lead_date: dup.lead_date,
          status: dup.status,
          source: dup.source,
        },
      };
    }
    return { isDuplicate: false, existingLead: null };
  } catch (err: any) {
    return { error: err?.message };
  }
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Profile } from "@/app/actions";
import { MarketingShell, MarketingSubView } from "./marketing-shell";
import { MarketingOverview } from "./overview/marketing-overview";
import { ChannelReportPanel } from "./channel/channel-report-panel";
import { CampaignPanel } from "./campaigns/campaign-panel";
import { LeadsPanel } from "./leads/leads-panel";
import { BranchesPanel } from "./branches/branches-panel";

interface MarketingClientProps {
  profile: Profile;
  initialView?: MarketingSubView;
}

export function MarketingClient({ profile, initialView = "overview" }: MarketingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") as MarketingSubView | null;

  const [activeView, setActiveView] = useState<MarketingSubView>(viewParam || initialView);

  useEffect(() => {
    if (viewParam && viewParam !== activeView) {
      setActiveView(viewParam);
    }
  }, [viewParam]);

  const handleViewChange = (view: MarketingSubView) => {
    setActiveView(view);
    const url = view === "overview" ? "/dashboard/marketing" : `/dashboard/marketing?view=${view}`;
    window.history.replaceState(null, "", url);
  };

  return (
    <MarketingShell
      profile={profile}
      activeView={activeView}
      onViewChange={handleViewChange}
    >
      {activeView === "overview" && <MarketingOverview />}
      {activeView === "facebook" && <ChannelReportPanel platform="facebook" title="Báo cáo Facebook" />}
      {activeView === "tiktok" && <ChannelReportPanel platform="tiktok" title="Báo cáo TikTok" />}
      {activeView === "youtube" && <ChannelReportPanel platform="youtube" title="Báo cáo YouTube" />}
      {activeView === "website" && <ChannelReportPanel platform="website" title="Báo cáo Website" />}
      {activeView === "facebook_ads" && <CampaignPanel platform="facebook_ads" title="Chiến dịch Facebook Ads" />}
      {activeView === "tiktok_ads" && <CampaignPanel platform="tiktok_ads" title="Chiến dịch TikTok Ads" />}
      {activeView === "leads" && <LeadsPanel />}
      {activeView === "branches" && <BranchesPanel />}
    </MarketingShell>
  );
}

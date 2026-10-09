import { getSessionUser } from "@/app/actions";
import { redirect } from "next/navigation";
import { MarketingClient } from "../marketing-client";

export default async function TikTokAdsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <MarketingClient profile={user} initialView="tiktok_ads" />;
}

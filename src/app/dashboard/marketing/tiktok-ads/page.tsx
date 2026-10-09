import { redirect } from "next/navigation";

export default async function TikTokAdsPage() {
  redirect("/dashboard?view=tiktok_ads");
}

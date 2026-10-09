import { redirect } from "next/navigation";

export default async function TikTokReportPage() {
  redirect("/dashboard?view=tiktok");
}

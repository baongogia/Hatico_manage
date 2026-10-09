import { redirect } from "next/navigation";

export default async function YouTubeReportPage() {
  redirect("/dashboard?view=youtube");
}

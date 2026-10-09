import { redirect } from "next/navigation";

export default async function WebsiteReportPage() {
  redirect("/dashboard?view=website");
}

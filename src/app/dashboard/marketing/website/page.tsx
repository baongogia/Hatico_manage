import { getSessionUser } from "@/app/actions";
import { redirect } from "next/navigation";
import { MarketingClient } from "../marketing-client";

export default async function WebsiteReportPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <MarketingClient profile={user} initialView="website" />;
}

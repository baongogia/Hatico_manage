import { redirect } from "next/navigation";

export default async function MarketingLeadsPage() {
  redirect("/dashboard?view=leads");
}

import { redirect } from "next/navigation";

export default async function MarketingBranchesPage() {
  redirect("/dashboard?view=branches");
}

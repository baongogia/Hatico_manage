import { redirect } from "next/navigation";

export default async function FacebookReportPage() {
  redirect("/dashboard?view=facebook");
}

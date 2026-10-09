import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MarketingDashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const viewStr = typeof resolvedParams.view === "string" ? resolvedParams.view : "overview";
  redirect(`/dashboard?view=${viewStr}`);
}

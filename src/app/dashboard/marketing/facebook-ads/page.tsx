import { redirect } from "next/navigation";

export default async function FacebookAdsPage() {
  redirect("/dashboard?view=facebook_ads");
}

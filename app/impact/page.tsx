import { redirect } from "next/navigation";

export default function ImpactPage() {
  redirect("/dashboard?tab=emissions");
}

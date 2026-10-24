import { redirect } from "next/navigation";

export default function SavingsPage() {
  redirect("/dashboard?tab=savings");
}

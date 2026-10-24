import { redirect } from "next/navigation";

export default function TradeInPage() {
  redirect("/dashboard?tab=trade-in");
}

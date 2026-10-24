import { redirect } from "next/navigation";

export default function ChargingPage() {
  redirect("/dashboard?tab=charging");
}

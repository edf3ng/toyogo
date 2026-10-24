import { Suspense } from "react";
import { Roadside } from "@/components/Roadside";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="px-4 pt-16 text-sm text-muted">Loading the recommendation.</p>}>
      <Roadside />
    </Suspense>
  );
}

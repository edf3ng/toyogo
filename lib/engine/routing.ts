import { COPY } from "@/config/copy";
import { FINANCE } from "@/config/finance";
import type { Cents, DrivingProfile, MoveId, NextStep } from "@/types";

/**
 * Deterministic next step. Income change routes to the extension even when
 * another move ranked first, matching the routing rule in the spec.
 */
export function routeNext(input: {
  moveId: MoveId;
  driving: DrivingProfile;
  payoffCents: Cents;
  vehicleLabel?: string;
}): NextStep {
  const { moveId, driving, payoffCents, vehicleLabel } = input;

  if (moveId === "DEFER_PAYMENT" || driving.upcoming === "income_change") {
    return {
      kind: "SELF_SERVICE",
      title: "Request a one-month payment extension",
      body: "A self-service example. Nothing here is submitted to a lender.",
      disclosure: COPY.deferralDisclosure,
    };
  }

  if (moveId === "TRADE_UP" || moveId === "HYBRID_UPGRADE" || moveId === "LEASE_BUYOUT") {
    const which = vehicleLabel ? ` for the ${vehicleLabel}` : "";
    return {
      kind: "ELIGIBLE_OFFER",
      title: "Review an example offer",
      body: `${COPY.noApproval} The example vehicle${which} is priced with the terms in Assumptions.`,
    };
  }

  if (
    (moveId === "PAY_OFF_EARLY" || moveId === "REFINANCE") &&
    payoffCents >= FINANCE.followUpThresholdCents
  ) {
    return {
      kind: "FOLLOW_UP",
      title: "Talk this through with a specialist",
      body: "The payoff is large enough that a person should check it before anything changes. The handoff is the brief they would start from.",
    };
  }

  if (moveId === "KEEP") {
    return {
      kind: "SELF_SERVICE",
      title: "Keep the current plan",
      body: "No change to the account. The summary is there if you want the numbers on one page.",
    };
  }

  return {
    kind: "SELF_SERVICE",
    title: "Review the example terms",
    body: "The simplest next step stays on this page. No appointment is booked.",
  };
}

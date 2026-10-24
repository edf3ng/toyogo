export const COPY = {
  product: "ToyoGo",
  footer:
    "Synthetic data — not actual Toyota Financial Services products, pricing, or terms.",
  exampleTerms: "Example terms — synthetic data, not actual TFS policy.",
  modelledValue:
    "Modelled estimate, not market-sampled. No live listing sample is in this figure.",
  stylisedVehicle: "Stylised illustration — not your actual vehicle.",
  modelCredit:
    "The car is a supplied 2025 Camry model. It is an illustration — not your actual vehicle, and not a Toyota Financial Services asset.",
  tailpipe:
    "Tailpipe only. A battery-electric vehicle still has upstream emissions from generating electricity. The EPA figure here is 0 grams at the tailpipe.",
  phevShare:
    "Plug-in hybrid fuel cost assumes part of the miles run on a charge. That share is an assumption, not an EPA utility factor.",
  electricity:
    "The electricity rate is an assumption. Residential rates vary by state.",
  noApproval:
    "You may be eligible, subject to review. This is not an approval and not a Toyota Financial Services offer.",
  deferralDisclosure:
    "Example terms: the skipped payment moves to the end of the term, interest accrues during the deferral, and the account stays in good standing. This is not Toyota Financial Services policy.",
  repairNote:
    "A repair on the horizon is noted for the handoff. It is not scored, because this demo has no repair estimate to put in the math.",
} as const;

export const PRIORITY_LABEL: Record<string, string> = {
  lowest_payment: "Lowest monthly payment",
  lowest_total: "Lowest total cost",
  newest_car: "Newest car",
  lowest_emissions: "Lowest emissions",
};

export const HORIZON_LABEL: Record<string, string> = {
  under_1: "Under a year",
  "1_to_3": "1–3 years",
  "3_plus": "3+ years",
  unsure: "Not sure",
};

export const MIX_LABEL: Record<string, string> = {
  city: "Mostly city",
  highway: "Mostly highway",
  mix: "A mix",
};

export const UPCOMING_LABEL: Record<string, string> = {
  lease_ending: "Lease ending",
  repair_needed: "Repair needed",
  income_change: "Income change",
  none: "None of these",
};

export const MILE_PRESETS = [
  { id: "light", label: "Light", miles: 8_000 },
  { id: "average", label: "Average", miles: 12_000 },
  { id: "heavy", label: "Heavy", miles: 18_000 },
] as const;

/** Drag-rank order maps onto these weights, highest rank first. They sum to 1. */
export const PRIORITY_KEYS = [
  "payment",
  "total",
  "fuel",
  "co2",
  "practical",
  "performance",
] as const;

export type PriorityKey = (typeof PRIORITY_KEYS)[number];

export const RANK_WEIGHTS = [0.34, 0.22, 0.16, 0.12, 0.09, 0.07] as const;

export const PRIORITY_COPY: Record<PriorityKey, string> = {
  payment: "Monthly payment",
  total: "Total cost over 5 years",
  fuel: "Fuel savings",
  co2: "Environmental impact",
  practical: "Cargo or seating",
  performance: "Performance",
};

export function weightsForRank(order: readonly PriorityKey[]): Record<PriorityKey, number> {
  const weights = {} as Record<PriorityKey, number>;
  PRIORITY_KEYS.forEach((key) => {
    weights[key] = 0;
  });
  order.forEach((key, index) => {
    weights[key] = RANK_WEIGHTS[index] ?? RANK_WEIGHTS[RANK_WEIGHTS.length - 1];
  });
  return weights;
}

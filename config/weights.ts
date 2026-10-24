import type { KeepHorizon, MoveId, Priority, Weights } from "@/types";

/** Stop 2 question 4 picks one of these. They sum to 1. */
export const WEIGHTS: Record<Priority, Weights> = {
  lowest_payment: { payment: 0.5, total: 0.2, fuel: 0.15, co2: 0.05, fit: 0.1 },
  lowest_total: { payment: 0.15, total: 0.5, fuel: 0.2, co2: 0.05, fit: 0.1 },
  newest_car: { payment: 0.25, total: 0.15, fuel: 0.1, co2: 0.05, fit: 0.45 },
  lowest_emissions: { payment: 0.15, total: 0.15, fuel: 0.2, co2: 0.4, fit: 0.1 },
};

/**
 * How well a move matches "how long do you plan to keep this car".
 * 1 means the move agrees with that horizon. This is a judgment, not a measurement.
 * Hybrid sits below an outright replacement on a short horizon because it is a
 * powertrain change, not the "replace this car" answer.
 */
export const HORIZON_FIT: Record<KeepHorizon, Record<MoveId, number>> = {
  under_1: {
    KEEP: 0.12,
    PAY_OFF_EARLY: 0.18,
    REFINANCE: 0.22,
    TRADE_UP: 1,
    LEASE_BUYOUT: 0.28,
    LEASE_RETURN: 0.55,
    HYBRID_UPGRADE: 0.58,
    DEFER_PAYMENT: 0.35,
  },
  "1_to_3": {
    KEEP: 0.55,
    PAY_OFF_EARLY: 0.5,
    REFINANCE: 0.6,
    TRADE_UP: 0.72,
    LEASE_BUYOUT: 0.58,
    LEASE_RETURN: 0.4,
    HYBRID_UPGRADE: 0.74,
    DEFER_PAYMENT: 0.48,
  },
  "3_plus": {
    KEEP: 0.92,
    PAY_OFF_EARLY: 0.84,
    REFINANCE: 0.7,
    TRADE_UP: 0.22,
    LEASE_BUYOUT: 0.8,
    LEASE_RETURN: 0.16,
    HYBRID_UPGRADE: 0.4,
    DEFER_PAYMENT: 0.5,
  },
  unsure: {
    KEEP: 0.6,
    PAY_OFF_EARLY: 0.5,
    REFINANCE: 0.55,
    TRADE_UP: 0.55,
    LEASE_BUYOUT: 0.55,
    LEASE_RETURN: 0.4,
    HYBRID_UPGRADE: 0.6,
    DEFER_PAYMENT: 0.5,
  },
};

/** Subtracted after the weighted factors. Unitless, on the same 0–1 scale. */
export const COMPLEXITY: Record<MoveId, number> = {
  KEEP: 0,
  DEFER_PAYMENT: 0.08,
  PAY_OFF_EARLY: 0.22,
  REFINANCE: 0.3,
  LEASE_RETURN: 0.32,
  LEASE_BUYOUT: 0.36,
  TRADE_UP: 0.4,
  HYBRID_UPGRADE: 0.46,
};

export const COMPLEXITY_PENALTY = 0.08;

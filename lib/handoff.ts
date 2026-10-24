import type { DrivingProfile, Recommendation } from "@/types";

export const HANDOFF_KEY = "nextmove-handoff";

export interface HandoffSnapshot {
  who: string;
  vehicleLine: string;
  mileage: number;
  contractLine: string;
  driving: DrivingProfile;
  result: Recommendation;
}

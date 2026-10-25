import { describe, expect, it } from "vitest";
import { MODEL_URLS, suggestionModelUrl } from "@/lib/models";

describe("suggestionModelUrl", () => {
  it("uses the Camry Hybrid file for the 2024 Camry Hybrid", () => {
    expect(suggestionModelUrl("Camry Hybrid LE", "2024 Camry Hybrid")).toBe(MODEL_URLS.camryHybrid);
  });

  it("keeps the stand-in Camry for a gas Camry", () => {
    expect(suggestionModelUrl("Camry", "2024 Camry")).toBe(MODEL_URLS.camry);
  });
});

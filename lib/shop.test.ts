import { describe, expect, it } from "vitest";
import { buyInventoryUrl } from "@/lib/shop";

describe("buyInventoryUrl", () => {
  it("opens Camry Hybrid inventory near the saved ZIP", () => {
    expect(buyInventoryUrl("Camry Hybrid LE", "2024 Camry Hybrid", "78704")).toBe(
      "https://www.toyota.com/search-inventory/model/camryhybrid/?zipcode=78704",
    );
  });

  it("opens bZ4X inventory without a ZIP", () => {
    expect(buyInventoryUrl("bZ4X", "2025 bZ4X")).toBe("https://www.toyota.com/search-inventory/model/bz4x/");
  });
});

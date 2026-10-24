import type { Cents } from "@/types";

/** The glTF material the viewer recolours. Glass, tires, and trim use other names. */
export const BODY_MATERIAL_NAME = "red";

export interface PaintSwatch {
  id: string;
  name: string;
  hex: string;
}

export interface OptionPackage {
  id: string;
  name: string;
  priceCents: Cents;
}

/**
 * Paint is vehicle data. Supersonic red is a real-style paint chip and is the
 * only red in the product. It is not the UI accent.
 */
export const PAINTS: PaintSwatch[] = [
  { id: "ice", name: "Ice cap", hex: "#F3F1EB" },
  { id: "silver", name: "Classic silver", hex: "#C5C8CE" },
  { id: "graphite", name: "Graphite", hex: "#5C636A" },
  { id: "midnight", name: "Midnight", hex: "#1C1E21" },
  { id: "blueprint", name: "Blueprint", hex: "#1F4E79" },
  { id: "supersonic", name: "Supersonic red", hex: "#B42318" },
  { id: "cement", name: "Cement", hex: "#8C8578" },
  { id: "bronze", name: "Bronze oxide", hex: "#6E4B32" },
];

/** Invented option prices. Example pricing, not a Toyota build sheet. */
export const PACKAGES: OptionPackage[] = [
  { id: "audio", name: "Premium audio", priceCents: 120_000 },
  { id: "tow", name: "Tow package", priceCents: 150_000 },
  { id: "rails", name: "Roof rails", priceCents: 45_000 },
  { id: "mats", name: "All-weather mats", priceCents: 28_000 },
];

interface MsrpRow {
  test: (model: string) => boolean;
  cents: Cents;
}

/** More specific rows have to come first. Example MSRP, not a sticker. */
const MSRP_TABLE: MsrpRow[] = [
  { test: (m) => /corolla hybrid/i.test(m), cents: 2_890_000 },
  { test: (m) => /gr corolla/i.test(m), cents: 3_850_000 },
  { test: (m) => /corolla cross hybrid/i.test(m), cents: 2_980_000 },
  { test: (m) => /corolla cross/i.test(m), cents: 2_680_000 },
  { test: (m) => /corolla/i.test(m), cents: 2_350_000 },
  { test: (m) => /prius prime/i.test(m), cents: 3_690_000 },
  { test: (m) => /prius/i.test(m), cents: 3_250_000 },
  { test: (m) => /\bbz4x\b|\bbz\b/i.test(m), cents: 4_520_000 },
  { test: (m) => /tacoma hybrid/i.test(m), cents: 4_780_000 },
  { test: (m) => /tacoma/i.test(m), cents: 4_150_000 },
  { test: (m) => /grand highlander hybrid/i.test(m), cents: 5_950_000 },
  { test: (m) => /grand highlander/i.test(m), cents: 5_480_000 },
  { test: (m) => /highlander hybrid/i.test(m), cents: 4_980_000 },
  { test: (m) => /highlander/i.test(m), cents: 4_620_000 },
  { test: (m) => /rav4 prime/i.test(m), cents: 4_550_000 },
  { test: (m) => /rav4 hybrid/i.test(m), cents: 3_550_000 },
  { test: (m) => /rav4/i.test(m), cents: 3_280_000 },
  { test: (m) => /camry hybrid|camry hev/i.test(m), cents: 3_350_000 },
  { test: (m) => /camry/i.test(m), cents: 3_050_000 },
  { test: (m) => /sienna/i.test(m), cents: 4_400_000 },
  { test: (m) => /tundra hybrid/i.test(m), cents: 6_200_000 },
  { test: (m) => /tundra/i.test(m), cents: 5_700_000 },
  { test: (m) => /4runner hybrid/i.test(m), cents: 5_400_000 },
  { test: (m) => /4runner/i.test(m), cents: 4_850_000 },
];

const DEFAULT_MSRP_CENTS = 3_200_000;

export function exampleMsrpCents(model: string): Cents {
  return MSRP_TABLE.find((row) => row.test(model))?.cents ?? DEFAULT_MSRP_CENTS;
}

export function packageTotalCents(packageIds: readonly string[]): Cents {
  return PACKAGES.filter((item) => packageIds.includes(item.id)).reduce(
    (sum, item) => sum + item.priceCents,
    0,
  );
}

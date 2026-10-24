import type { UpgradeRole } from "@/types";

/**
 * Closest electrified Toyota, plus the vehicle a trade-up prices.
 * Names are matched against FuelEconomy.gov model strings, not marketing trim names.
 */
export const UPGRADE_MAP: Record<string, Partial<Record<UpgradeRole, string>>> = {
  Corolla: {
    trade: "Corolla",
    hybrid: "Corolla Hybrid",
    phev: "Prius Prime",
    bev: "bZ4X",
  },
  "Corolla Hatchback": {
    trade: "Corolla Hatchback",
    hybrid: "Corolla Hybrid",
    phev: "Prius Prime",
    bev: "bZ4X",
  },
  "Corolla Cross": {
    trade: "Corolla Cross",
    hybrid: "Corolla Cross Hybrid",
  },
  Camry: { trade: "Camry", hybrid: "Camry Hybrid", bev: "bZ4X" },
  Prius: { trade: "Prius", phev: "Prius Prime", bev: "bZ4X" },
  "Prius Prime": { trade: "Prius Prime", bev: "bZ4X" },
  RAV4: {
    trade: "RAV4",
    hybrid: "RAV4 Hybrid",
    phev: "RAV4 Prime",
    bev: "bZ4X",
  },
  "RAV4 Prime": { trade: "RAV4 Prime", bev: "bZ4X" },
  Highlander: {
    trade: "Grand Highlander",
    hybrid: "Highlander Hybrid",
    bev: "bZ4X",
  },
  "Grand Highlander": {
    trade: "Grand Highlander",
    hybrid: "Grand Highlander Hybrid",
  },
  Tacoma: { trade: "Tacoma", hybrid: "Tacoma Hybrid" },
  Tundra: { trade: "Tundra", hybrid: "Tundra Hybrid" },
  "4Runner": { trade: "4Runner", hybrid: "4Runner Hybrid" },
  Sienna: { trade: "Sienna" },
  bZ4X: { trade: "bZ4X" },
};

export function upgradeKey(baseModel: string, model: string): string | undefined {
  if (UPGRADE_MAP[baseModel]) return baseModel;
  const found = Object.keys(UPGRADE_MAP).find(
    (key) => model.toLowerCase().startsWith(key.toLowerCase()),
  );
  return found;
}

/** True when an EPA model string is the intended upgrade target, not a sibling trim. */
export function modelMatchesTarget(vehicleModel: string, target: string): boolean {
  const name = vehicleModel.toLowerCase();
  switch (target.toLowerCase()) {
    case "corolla":
      return (
        /^corolla( |$)/i.test(vehicleModel) &&
        !/hybrid|cross|gr |hatch/i.test(name)
      );
    case "corolla hybrid":
      return /corolla hybrid/i.test(name);
    case "corolla hatchback":
      return /corolla hatchback/i.test(name) && !/hybrid/i.test(name);
    case "corolla cross":
      return /corolla cross/i.test(name) && !/hybrid/i.test(name);
    case "corolla cross hybrid":
      return /corolla cross hybrid/i.test(name);
    case "camry":
      return /^camry( |$)/i.test(vehicleModel) && !/hybrid|hev/i.test(name);
    case "camry hybrid":
      return /camry hybrid|camry hev/i.test(name);
    case "rav4":
      return /^rav4( |$)/i.test(vehicleModel) && !/hybrid|prime/i.test(name);
    case "rav4 hybrid":
      return /rav4 hybrid/i.test(name);
    case "rav4 prime":
      return /rav4 prime/i.test(name);
    case "highlander":
      return /^highlander( |$)/i.test(vehicleModel) && !/hybrid/i.test(name);
    case "highlander hybrid":
      return /highlander hybrid/i.test(name) && !/grand/i.test(name);
    case "grand highlander":
      return /grand highlander/i.test(name) && !/hybrid/i.test(name);
    case "grand highlander hybrid":
      return /grand highlander hybrid/i.test(name);
    case "tacoma":
      return /^tacoma/i.test(name) && !/hybrid/i.test(name);
    case "tacoma hybrid":
      return /tacoma hybrid/i.test(name);
    case "tundra":
      return /^tundra/i.test(name) && !/hybrid/i.test(name);
    case "tundra hybrid":
      return /tundra hybrid/i.test(name);
    case "4runner":
      return /^4runner/i.test(name) && !/hybrid/i.test(name);
    case "4runner hybrid":
      return /4runner hybrid/i.test(name);
    case "prius prime":
      return /prius prime/i.test(name);
    case "prius":
      return /^prius( |$)/i.test(vehicleModel) && !/prime/i.test(name);
    case "bz4x":
      return /^bz4x|^bz\b/i.test(name);
    case "sienna":
      return /sienna/i.test(name);
    default:
      return name.startsWith(target.toLowerCase());
  }
}

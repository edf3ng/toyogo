import type { PriorityKey } from "@/config/priorities";
import type { ChargeAccess } from "@/lib/engine/energy";
import type { SwitchInput } from "@/lib/engine/switch";
import type { Contract, DriveMix } from "@/types";

const AS_OF = "2026-10-24";
const GAS = 4.28;
const ELECTRICITY_CENTS = 14.5;

interface Driver {
  id: "alex" | "blair" | "casey";
  name: string;
  place: string;
  input: SwitchInput;
}

function driver(partial: {
  id: Driver["id"];
  name: string;
  place: string;
  current: SwitchInput["current"];
  contract: Contract;
  dailyMiles: number;
  chargeAccess: ChargeAccess;
  stationCount: number;
  budgetCents: number;
  priorities: PriorityKey[];
  mix?: DriveMix;
}): Driver {
  return {
    id: partial.id,
    name: partial.name,
    place: partial.place,
    input: {
      asOf: AS_OF,
      current: partial.current,
      contract: partial.contract,
      dailyMiles: partial.dailyMiles,
      mix: partial.mix ?? "mix",
      chargeAccess: partial.chargeAccess,
      stationCount: partial.stationCount,
      budgetCents: partial.budgetCents,
      cashDownCents: 0,
      priorities: partial.priorities,
      gasDollarsPerGallon: GAS,
      electricityCentsPerKwh: ELECTRICITY_CENTS,
    },
  };
}

/** Three drivers the same engine has to separate. */
export const DRIVERS: Driver[] = [
  driver({
    id: "alex",
    name: "Alex",
    place: "Austin",
    current: {
      id: "40241",
      year: 2019,
      model: "Corolla",
      cityMpg: 28,
      highwayMpg: 36,
      co2TailpipeGpm: 281,
      msrpCents: 2_350_000,
      miles: 68_000,
    },
    contract: { kind: "owned" },
    dailyMiles: 22,
    chargeAccess: "yes",
    stationCount: 12,
    budgetCents: 90_000,
    priorities: ["co2", "fuel", "payment", "total", "practical", "performance"],
  }),
  driver({
    id: "blair",
    name: "Blair",
    place: "Austin",
    current: {
      id: "42959",
      year: 2021,
      model: "RAV4",
      cityMpg: 27,
      highwayMpg: 35,
      co2TailpipeGpm: 296,
      msrpCents: 3_280_000,
      miles: 44_000,
      cargoCuFt: 37,
      horsepower: 203,
    },
    contract: {
      kind: "loan",
      principalCents: 3_280_000,
      annualRate: 0.049,
      months: 60,
      monthsElapsed: 38,
    },
    dailyMiles: 55,
    chargeAccess: "yes",
    stationCount: 12,
    budgetCents: 90_000,
    priorities: ["fuel", "co2", "performance", "practical", "payment", "total"],
  }),
  driver({
    id: "casey",
    name: "Casey",
    place: "rural Texas",
    current: {
      id: "38880",
      year: 2018,
      model: "Camry",
      cityMpg: 29,
      highwayMpg: 41,
      co2TailpipeGpm: 264,
      msrpCents: 3_050_000,
      miles: 91_000,
    },
    contract: { kind: "owned" },
    dailyMiles: 30,
    chargeAccess: "no",
    stationCount: 0,
    budgetCents: 70_000,
    priorities: ["payment", "fuel", "total", "co2", "practical", "performance"],
  }),
];

export function driverById(id: string): Driver {
  return DRIVERS.find((item) => item.id === id) ?? DRIVERS[0];
}

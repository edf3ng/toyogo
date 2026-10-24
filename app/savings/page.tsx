"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Landmark } from "@/components/Landmark";
import { formatDollars } from "@/lib/format";
import { energyCost } from "@/lib/engine/energy";
import { recommendSwitch } from "@/lib/engine/switch";
import { readTrip, type SavedTrip } from "@/lib/trip";

export default function SavingsPage() {
  const [trip, setTrip] = useState<SavedTrip | null | undefined>(undefined);
  const [daily, setDaily] = useState(30);
  const [gas, setGas] = useState(4.28);

  useEffect(() => {
    const saved = readTrip();
    setTrip(saved);
    if (saved) setDaily(saved.input.dailyMiles);
    fetch("/api/fuelprices")
      .then((response) => response.json())
      .then((body: { prices?: { regular?: number } }) => {
        if (body.prices?.regular && body.prices.regular > 0) setGas(body.prices.regular);
      })
      .catch(() => undefined);
  }, []);

  if (trip === undefined) return <p className="text-sm text-muted">Loading.</p>;
  if (!trip) {
    return (
      <Landmark marker="Fuel stop" kicker="Mile marker" title="Fuel savings">
        <Link href="/signup" className="mt-4 inline-block text-sm font-medium text-jade-800">
          Sign up
        </Link>
      </Landmark>
    );
  }

  const result = recommendSwitch({
    ...trip.input,
    dailyMiles: daily,
    gasDollarsPerGallon: gas,
  });
  const winner = result.winner;
  const annual = winner.monthlyEnergySavingCents * 12;
  const chart = [0, 1, 2, 3, 4, 5].map((year) => ({
    year: `Year ${year}`,
    savings: Math.round((annual * year) / 100),
  }));
  const miles = Math.max(daily, 1) * 250;
  const currentPer100 = (result.keep.annualEnergyCents / miles) * 100;
  const nextPer100 = (winner.annualEnergyCents / miles) * 100;
  const currentEnergy = energyCost({
    vehicle: {
      powertrain: "gas",
      cityMpg: trip.input.current.cityMpg,
      highwayMpg: trip.input.current.highwayMpg,
      kwhPer100: 0,
      electricRangeMiles: 0,
    },
    dailyMiles: daily,
    mix: "mix",
    chargeAccess: trip.input.chargeAccess,
    gasDollarsPerGallon: gas,
    electricityCentsPerKwh: trip.input.electricityCentsPerKwh,
  });

  return (
    <Landmark marker="Fuel stop" kicker="Mile marker" title="Fuel savings">
      <p className="mt-2 text-sm text-muted">
        Regular gas at ${gas.toFixed(2)} a gallon from FuelEconomy.gov, with the cache if the live price does not
        answer. Electricity stays the state average, {trip.input.electricityCentsPerKwh}¢ per kWh.
      </p>
      <label className="mt-6 block text-sm font-medium">
        {daily} miles a day
        <input
          className="mt-2 w-full"
          type="range"
          min={5}
          max={120}
          value={daily}
          onChange={(event) => setDaily(Number(event.target.value))}
        />
      </label>
      <p className="mt-6 text-4xl font-semibold tracking-tight">{formatDollars(annual)}</p>
      <p className="text-sm text-muted">saved a year on {winner.label}, versus keeping this car.</p>
      <div className="mt-6 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart}>
            <CartesianGrid stroke="#ddd6cb" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatDollars(Number(value) * 100)} />
            <Line type="monotone" dataKey="savings" stroke="#0e7c7b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-sm text-muted">Cumulative fuel savings, in dollars. The line uses the slider.</p>
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className="border border-line p-3">
          <p className="text-muted">This car, per 100 miles</p>
          <p className="mt-1 text-xl font-semibold">{formatDollars(currentPer100)}</p>
          <p className="text-muted">{currentEnergy.annualGallons.toFixed(0)} gallons a year at this pace</p>
        </div>
        <div className="border border-line p-3">
          <p className="text-muted">{winner.powertrain === "bev" ? "Electricity" : "Next car"}, per 100 miles</p>
          <p className="mt-1 text-xl font-semibold">{formatDollars(nextPer100)}</p>
          <p className="text-muted">{winner.label}</p>
        </div>
      </div>
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-jade-800">
        Back to recommendations
      </Link>
    </Landmark>
  );
}

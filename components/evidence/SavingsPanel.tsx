"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDollars } from "@/lib/format";
import { energyCost } from "@/lib/engine/energy";
import { lookupOption } from "@/lib/engine/switch";
import type { SavedTrip } from "@/lib/trip";

export function SavingsPanel({
  trip,
  suggestion,
}: {
  trip: SavedTrip;
  suggestion: { id: string | null; label: string };
}) {
  const [daily, setDaily] = useState(trip.input.dailyMiles);
  const [gas, setGas] = useState(4.28);

  useEffect(() => {
    fetch("/api/fuelprices")
      .then((response) => response.json())
      .then((body: { prices?: { regular?: number } }) => {
        if (body.prices?.regular && body.prices.regular > 0) setGas(body.prices.regular);
      })
      .catch(() => undefined);
  }, []);

  const priced = suggestion.id
    ? lookupOption({ ...trip.input, dailyMiles: daily, gasDollarsPerGallon: gas }, suggestion.id)
    : undefined;
  if (!priced) {
    return (
      <p>
        Gas savings are not modelled for the {suggestion.label}. That suggestion is outside the priced line-up, so
        this tab stays with this car only.
      </p>
    );
  }
  const winner = priced.option;
  const annual = winner.monthlyEnergySavingCents * 12;
  const chart = [0, 1, 2, 3, 4, 5].map((year) => ({
    year: `Year ${year}`,
    savings: Math.round((annual * year) / 100),
  }));
  const miles = Math.max(daily, 1) * 250;
  const currentPer100 = (priced.keep.annualEnergyCents / miles) * 100;
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
    <div>
      <p className="text-sm text-muted">
        Regular gas at ${gas.toFixed(2)} a gallon from FuelEconomy.gov, with the cache if the live price does not
        answer. Electricity stays the state average, {trip.input.electricityCentsPerKwh}¢ per kWh.
      </p>
      <label className="mt-4 block text-sm font-medium">
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
      <p className="mt-4 text-4xl font-semibold tracking-tight">{formatDollars(annual)}</p>
      <p className="text-sm text-muted">saved a year on {winner.label}, versus keeping this car.</p>
      <div className="mt-4 h-48 w-full">
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
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="border border-line p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Keep this car</p>
          <p className="mt-1">
            {trip.input.current.year} {trip.input.current.model}, per 100 miles
          </p>
          <p className="mt-1 text-xl font-semibold">{formatDollars(currentPer100)}</p>
          <p className="text-muted">{currentEnergy.annualGallons.toFixed(0)} gallons a year at this pace</p>
        </div>
        <div className="border border-line p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">If you switch</p>
          <p className="mt-1">{winner.label}, per 100 miles</p>
          <p className="mt-1 text-xl font-semibold">{formatDollars(nextPer100)}</p>
          <p className="text-muted">
            {formatDollars(priced.keep.annualEnergyCents)} a year now, {formatDollars(winner.annualEnergyCents)} on this
            car
          </p>
        </div>
      </div>
    </div>
  );
}

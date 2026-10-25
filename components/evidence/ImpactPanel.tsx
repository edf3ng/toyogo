"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";
import { lookupOption } from "@/lib/engine/switch";
import type { SavedTrip } from "@/lib/trip";

const MAX_DOTS = 72;
const DOT_RADIUS = 3.6;
const ANNUAL_MIN = 2000;
const ANNUAL_MAX = 30000;
const SPEED = 0.00048;

type Dot = { x: number; y: number; vx: number; vy: number };

function hash(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function makeDot(index: number): Dot {
  const angle = hash(index, 5) * Math.PI * 2;
  return {
    x: 0.08 + hash(index, 1) * 0.84,
    y: 0.08 + hash(index, 2) * 0.84,
    vx: Math.cos(angle) * SPEED,
    vy: Math.sin(angle) * SPEED,
  };
}

function setCount(dots: Dot[], target: number): void {
  while (dots.length < target) dots.push(makeDot(dots.length));
  if (dots.length > target) dots.length = target;
  for (let i = 0; i < dots.length; i++) {
    const dot = dots[i];
    const mag = Math.hypot(dot.vx, dot.vy);
    if (mag === 0) {
      const angle = hash(i, 5) * Math.PI * 2;
      dot.vx = Math.cos(angle) * SPEED;
      dot.vy = Math.sin(angle) * SPEED;
    } else {
      dot.vx = (dot.vx / mag) * SPEED;
      dot.vy = (dot.vy / mag) * SPEED;
    }
  }
}

function dotCount(pounds: number, scale: number): number {
  if (pounds <= 0) return 0;
  return Math.min(MAX_DOTS, Math.max(1, Math.round((pounds / Math.max(scale, 1)) * MAX_DOTS)));
}

function EmissionField({ pounds, scale }: { pounds: number; scale: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const paintRef = useRef<() => void>(() => undefined);
  const count = dotCount(pounds, scale);

  useEffect(() => {
    setCount(dotsRef.current, count);
    paintRef.current();
  }, [count]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = { w: 1, h: 1 };
    const paint = () => {
      ctx.clearRect(0, 0, size.w, size.h);
      for (const dot of dotsRef.current) {
        ctx.beginPath();
        ctx.fillStyle = "#14202a";
        ctx.arc(dot.x * size.w, dot.y * size.h, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    paintRef.current = paint;

    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.w = Math.max(1, rect.width);
      size.h = Math.max(1, rect.height);
      canvas.width = Math.floor(size.w * dpr);
      canvas.height = Math.floor(size.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(wrap);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const tick = () => {
      const pad = DOT_RADIUS + 1;
      const minX = pad / size.w;
      const maxX = 1 - pad / size.w;
      const minY = pad / size.h;
      const maxY = 1 - pad / size.h;
      for (const dot of dotsRef.current) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < minX) {
          dot.x = minX;
          dot.vx = Math.abs(dot.vx);
        } else if (dot.x > maxX) {
          dot.x = maxX;
          dot.vx = -Math.abs(dot.vx);
        }
        if (dot.y < minY) {
          dot.y = minY;
          dot.vy = Math.abs(dot.vy);
        } else if (dot.y > maxY) {
          dot.y = maxY;
          dot.vy = -Math.abs(dot.vy);
        }
      }
      paint();
      frame = requestAnimationFrame(tick);
    };

    if (!reduce) frame = requestAnimationFrame(tick);
    else paint();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      paintRef.current = () => undefined;
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative h-40 overflow-hidden bg-[#e7f2f0]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
    </div>
  );
}

export function ImpactPanel({
  trip,
  suggestion,
}: {
  trip: SavedTrip;
  suggestion: { id: string | null; label: string };
}) {
  const [annual, setAnnual] = useState(trip.input.dailyMiles * 250);
  const priced = suggestion.id
    ? lookupOption({ ...trip.input, dailyMiles: annual / 250 }, suggestion.id)
    : undefined;
  if (!priced) {
    return (
      <p>
        Tailpipe CO2 is not modelled for the {suggestion.label}. That suggestion is outside the priced line-up.
      </p>
    );
  }
  const keep = Math.max(0, priced.keep.annualCo2Lbs);
  const next = Math.max(0, priced.option.annualCo2Lbs);
  const avoided = Math.max(0, keep - next);
  const keepAtMaxMiles = annual > 0 ? keep * (ANNUAL_MAX / annual) : keep;
  const scale = Math.max(keepAtMaxMiles, 1);
  const cut = keep > 0 ? Math.round((avoided / keep) * 100) : 0;
  const keepName = `${trip.input.current.year} ${trip.input.current.model}`;

  return (
    <div>
      <p className="text-sm text-muted">
        Tailpipe only. Left is the {keepName}; right is the {priced.option.label}. A battery EV is 0 at the tailpipe.
      </p>
      <label className="mt-4 block text-sm font-medium">
        {formatNumber(annual)} miles a year
        <input
          className="mt-2 w-full"
          type="range"
          min={ANNUAL_MIN}
          max={ANNUAL_MAX}
          step={500}
          value={annual}
          onChange={(event) => setAnnual(Number(event.target.value))}
        />
      </label>
      <p className="mt-4 text-4xl font-semibold tracking-tight">{formatNumber(Math.round(avoided))} lb</p>
      <p className="text-sm text-muted">
        less tailpipe CO2 a year if you switch
        {keep > 0 ? ` — ${cut}% less than the ${keepName}.` : "."}
      </p>
      <div className="mt-6 grid grid-cols-2 items-end gap-4">
        <figure>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Keep this car</p>
          <EmissionField pounds={keep} scale={scale} />
          <figcaption className="mt-2 text-sm">
            {keepName}
            <span className="mt-1 block text-lg font-semibold">{formatNumber(Math.round(keep))} lb</span>
          </figcaption>
        </figure>
        <figure>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">If you switch</p>
          <EmissionField pounds={next} scale={scale} />
          <figcaption className="mt-2 text-sm">
            {priced.option.label}
            <span className="mt-1 block text-lg font-semibold">{formatNumber(Math.round(next))} lb</span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

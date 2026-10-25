"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";
import { recommendSwitch } from "@/lib/engine/switch";
import type { SavedTrip } from "@/lib/trip";

const MAX_DOTS = 72;
const DOT_RADIUS = 3.6;

type Dot = { x: number; y: number; vx: number; vy: number };

function hash(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function makeDot(index: number): Dot {
  const angle = hash(index, 5) * Math.PI * 2;
  const speed = 0.0012 + hash(index, 6) * 0.0018;
  return {
    x: 0.08 + hash(index, 1) * 0.84,
    y: 0.08 + hash(index, 2) * 0.84,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function dotCount(pounds: number, scale: number): number {
  if (pounds <= 0) return 0;
  return Math.max(1, Math.round((pounds / Math.max(scale, 1)) * MAX_DOTS));
}

function EmissionField({ pounds, scale }: { pounds: number; scale: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const countRef = useRef(0);
  const count = dotCount(pounds, scale);
  countRef.current = count;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = { w: 1, h: 1 };
    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.w = Math.max(1, rect.width);
      size.h = Math.max(1, rect.height);
      canvas.width = Math.floor(size.w * dpr);
      canvas.height = Math.floor(size.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(wrap);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const draw = () => {
      const dots = dotsRef.current;
      const target = countRef.current;
      while (dots.length < target) dots.push(makeDot(dots.length));
      if (dots.length > target) dots.length = target;

      ctx.clearRect(0, 0, size.w, size.h);
      const pad = DOT_RADIUS + 1;
      const minX = pad / size.w;
      const maxX = 1 - pad / size.w;
      const minY = pad / size.h;
      const maxY = 1 - pad / size.h;

      for (const dot of dots) {
        if (!reduce) {
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
        ctx.beginPath();
        ctx.fillStyle = "#14202a";
        ctx.arc(dot.x * size.w, dot.y * size.h, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) frame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative h-40 overflow-hidden bg-[#e7f2f0]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
    </div>
  );
}

export function ImpactPanel({ trip }: { trip: SavedTrip }) {
  const [annual, setAnnual] = useState(trip.input.dailyMiles * 250);
  const result = recommendSwitch({ ...trip.input, dailyMiles: annual / 250 });
  const keep = Math.max(0, result.keep.annualCo2Lbs);
  const next = Math.max(0, result.winner.annualCo2Lbs);
  const avoided = Math.max(0, keep - next);
  const scale = Math.max(keep, 1);

  return (
    <div>
      <p className="text-sm text-muted">
        Tailpipe only. A battery EV is 0 grams at the tailpipe. Making the electricity is not in this figure.
      </p>
      <label className="mt-4 block text-sm font-medium">
        {formatNumber(annual)} miles a year
        <input
          className="mt-2 w-full"
          type="range"
          min={2000}
          max={30000}
          step={500}
          value={annual}
          onChange={(event) => setAnnual(Number(event.target.value))}
        />
      </label>
      <p className="mt-4 text-4xl font-semibold tracking-tight">{formatNumber(Math.round(avoided))} lb</p>
      <p className="text-sm text-muted">less tailpipe CO2 a year on {result.winner.label}.</p>
      <div className="mt-6 grid grid-cols-2 items-end gap-4">
        <figure>
          <EmissionField pounds={keep} scale={scale} />
          <figcaption className="mt-2 text-sm">
            Keep the {trip.input.current.year} {trip.input.current.model}
            <span className="mt-1 block font-medium">{formatNumber(Math.round(keep))} lb</span>
          </figcaption>
        </figure>
        <figure>
          <EmissionField pounds={next} scale={scale} />
          <figcaption className="mt-2 text-sm">
            {result.winner.label}
            <span className="mt-1 block font-medium">{formatNumber(Math.round(next))} lb</span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

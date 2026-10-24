"use client";

import { useEffect, useRef } from "react";

function fade(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function noise(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return fade(i + seed) * (1 - u) + fade(i + 1 + seed) * u;
}

function ridge(x: number, seed: number): number {
  return noise(x * 0.85, seed) * 0.55 + noise(x * 2.1, seed + 4) * 0.3 + noise(x * 4.6, seed + 11) * 0.15;
}

function drawRange(
  ctx: CanvasRenderingContext2D,
  width: number,
  base: number,
  amplitude: number,
  seed: number,
  offset: number,
  top: string,
  bottom: string,
  snow: boolean,
) {
  const step = 7;
  const points: [number, number][] = [];
  for (let x = -step; x <= width + step; x += step) {
    const sample = ridge((x + offset) * 0.012, seed);
    points.push([x, base - sample * amplitude]);
  }
  ctx.beginPath();
  ctx.moveTo(0, base + amplitude);
  for (const [x, y] of points) ctx.lineTo(x, y);
  ctx.lineTo(width, base + amplitude);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, base - amplitude, 0, base + 30);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fill();

  for (let index = 1; index < points.length; index += 1) {
    const [x0, y0] = points[index - 1];
    const [x1, y1] = points[index];
    const slope = (y1 - y0) / Math.max(1, x1 - x0);
    ctx.fillStyle = slope > 0 ? "rgba(20, 32, 42, 0.16)" : "rgba(253, 251, 247, 0.14)";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, base + amplitude);
    ctx.lineTo(x0, base + amplitude);
    ctx.closePath();
    ctx.fill();
  }

  if (!snow) return;
  ctx.fillStyle = "rgba(247, 244, 238, 0.94)";
  for (let index = 1; index < points.length - 1; index += 1) {
    const height = (base - points[index][1]) / amplitude;
    const left = (base - points[index - 1][1]) / amplitude;
    const right = (base - points[index + 1][1]) / amplitude;
    if (height > left && height > right && height > 0.58) {
      ctx.beginPath();
      ctx.moveTo(points[index - 1][0], points[index - 1][1] + 10);
      ctx.lineTo(points[index][0], points[index][1]);
      ctx.lineTo(points[index + 1][0], points[index + 1][1] + 10);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function pine(ctx: CanvasRenderingContext2D, x: number, y: number, height: number) {
  ctx.fillStyle = "#123f3a";
  ctx.beginPath();
  ctx.moveTo(x, y - height * 1.45);
  ctx.lineTo(x + height * 0.34, y - height * 0.55);
  ctx.lineTo(x - height * 0.34, y - height * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y - height);
  ctx.lineTo(x + height * 0.46, y);
  ctx.lineTo(x - height * 0.46, y);
  ctx.closePath();
  ctx.fill();
}

export function Mountains({ banner = false }: { banner?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let raf = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width < 2 || height < 2) return;
      const ctx = context;
      const travel = reduced ? 0 : frame;

      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, "#6e9eb0");
      sky.addColorStop(0.55, "#b7d5df");
      sky.addColorStop(1, "#e7f2f4");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      const sunY = height * (banner ? 0.42 : 0.34);
      const glow = ctx.createRadialGradient(width * 0.72, sunY, 8, width * 0.72, sunY, width * 0.28);
      glow.addColorStop(0, "rgba(243, 210, 162, 0.55)");
      glow.addColorStop(1, "rgba(243, 210, 162, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(253, 251, 247, 0.72)";
      for (let cloud = 0; cloud < 4; cloud += 1) {
        const drift = ((travel * 0.15 + cloud * width * 0.28) % (width + 180)) - 90;
        const y = height * (0.08 + cloud * 0.05);
        ctx.beginPath();
        ctx.ellipse(drift, y, 54, 16, 0, 0, Math.PI * 2);
        ctx.ellipse(drift + 28, y + 4, 36, 14, 0, 0, Math.PI * 2);
        ctx.ellipse(drift - 26, y + 6, 30, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      drawRange(ctx, width, height * (banner ? 0.92 : 0.62), height * 0.34, 2, travel * 0.35, "#d5e4e6", "#a9c4c8", true);
      drawRange(ctx, width, height * (banner ? 1.05 : 0.74), height * 0.32, 7, travel * 0.7, "#7ea39b", "#3f6d66", true);
      drawRange(ctx, width, height * (banner ? 1.2 : 0.86), height * 0.24, 13, travel * 1.15, "#1f6d64", "#0e4a44", false);

      if (!banner) {
        const ground = height * 0.78;
        for (let index = 0; index < 28; index += 1) {
          const span = 90;
          const x = ((index * span - travel * 1.4) % (width + span)) - 20;
          const scale = 16 + noise(index, 3) * 18;
          if (noise(index * 1.7, 8) > 0.28) pine(ctx, x, ground, scale);
        }

        ctx.fillStyle = "#3a4038";
        ctx.fillRect(0, height * 0.8, width, height);
        ctx.fillStyle = "#2e3440";
        ctx.fillRect(0, height * 0.84, width, height);
        ctx.strokeStyle = "#e8913a";
        ctx.lineWidth = 3;
        ctx.setLineDash([26, 22]);
        ctx.lineDashOffset = -travel * 1.8;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.91);
        ctx.lineTo(width, height * 0.91);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const loop = () => {
      frame += 1;
      draw();
      raf = requestAnimationFrame(loop);
    };
    if (!reduced) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [banner]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#9ec3cf]" aria-hidden>
      <canvas ref={ref} className="h-full w-full" />
    </div>
  );
}

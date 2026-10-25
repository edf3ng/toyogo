import { NextResponse } from "next/server";
import { buyableToday } from "@/config/electrified-catalog";
import { recommendVehicle, engineAdvice, rankedOptions } from "@/lib/advice";
import { recommendSwitch, type SwitchInput } from "@/lib/engine/switch";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { input?: SwitchInput } | null;
  const input = body?.input;
  if (!input?.current?.model || !Number.isFinite(input.dailyMiles)) {
    return NextResponse.json({ advice: null }, { status: 400 });
  }

  // The scorer runs here rather than on the client so the figures Gemini is
  // given are the same ones the rest of the page shows.
  let result;
  try {
    result = recommendSwitch(input);
  } catch {
    return NextResponse.json({ advice: null }, { status: 400 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const year = Number(input.asOf.slice(0, 4)) || new Date().getUTCFullYear();
    return NextResponse.json({ advice: engineAdvice(rankedOptions(result), buyableToday(year)) });
  }

  const advice = await recommendVehicle(input, result, key, process.env.GEMINI_MODEL ?? "gemini-3.8-flash");
  return NextResponse.json({ advice });
}

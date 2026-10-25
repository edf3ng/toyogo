import { NextResponse } from "next/server";
import { buyableToday } from "@/config/electrified-catalog";
import { engineAdvice, rankedOptions } from "@/lib/advice";
import { recommendSwitch, type SwitchInput } from "@/lib/engine/switch";

/**
 * The score already ranked the cars. This route only labels that ranking.
 * Gemini does not choose the model.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { input?: SwitchInput } | null;
  const input = body?.input;
  if (!input?.current?.model || !Number.isFinite(input.dailyMiles)) {
    return NextResponse.json({ advice: null }, { status: 400 });
  }

  let result;
  try {
    result = recommendSwitch(input);
  } catch {
    return NextResponse.json({ advice: null }, { status: 400 });
  }

  const year = Number(input.asOf.slice(0, 4)) || new Date().getUTCFullYear();
  return NextResponse.json({ advice: engineAdvice(rankedOptions(result), buyableToday(year)) });
}

import { NextResponse } from "next/server";
import { explainTemplate, type ExplainFacts } from "@/lib/explain";

function isFacts(value: unknown): value is ExplainFacts {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ExplainFacts>;
  return typeof row.title === "string" && typeof row.monthly === "string" && typeof row.nextTitle === "string";
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!isFacts(body)) {
    return NextResponse.json({ text: "", source: "template" }, { status: 400 });
  }
  const template = explainTemplate(body);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ text: template, source: "template" });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Do not introduce, recalculate, or alter any number. Use only the figures provided. Write 3 or 4 short sentences.",
          },
          { role: "user", content: JSON.stringify(body) },
        ],
      }),
    });
    if (!response.ok) throw new Error(String(response.status));
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("empty");
    return NextResponse.json({ text, source: "llm" });
  } catch {
    return NextResponse.json({ text: template, source: "template" });
  } finally {
    clearTimeout(timer);
  }
}

const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";

/** Models tried in turn when the configured one is overloaded. */
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.8-flash"];
/** A loaded model has been seen to take over a minute to answer. */
const ATTEMPT_TIMEOUT_MS = 100_000;
/** Total budget for one call, across every retry and fallback. */
const DEADLINE_MS = 150_000;

/** Seconds Gemini asks us to wait, from the RetryInfo on a 429. 0 when it says nothing. */
async function retryDelaySeconds(response: Response): Promise<number> {
  try {
    const body = (await response.json()) as {
      error?: { details?: { "@type"?: string; retryDelay?: string }[] };
    };
    const info = body.error?.details?.find((row) => String(row["@type"]).endsWith("RetryInfo"));
    return Number.parseFloat(String(info?.retryDelay ?? "0")) || 0;
  } catch {
    return 0;
  }
}

/**
 * Ask Gemini for JSON matching `schema`, and return the raw text.
 *
 * Gemini answers 503 whenever a model is busy, which happens in bursts lasting
 * tens of seconds, and a busy model can also take over a minute to answer.
 * Attempts cycle through the models with a growing backoff until the deadline,
 * because a fixed number of tries is spent within seconds during a burst.
 */
export async function generateJson(
  prompt: string,
  geminiKey: string,
  model: string,
  schema: unknown,
  options?: { deadlineMs?: number; attemptTimeoutMs?: number },
): Promise<string> {
  const models = [model, ...FALLBACK_MODELS.filter((name) => name !== model)];
  const giveUpAt = Date.now() + (options?.deadlineMs ?? DEADLINE_MS);
  const attemptTimeoutMs = options?.attemptTimeoutMs ?? ATTEMPT_TIMEOUT_MS;
  let last = new Error("gemini unreachable");
  // A model the key cannot use at all answers 404, so it is dropped rather than
  // tried again on every round.
  const dead = new Set<string>();
  for (let attempt = 0; ; attempt += 1) {
    const live = models.filter((name) => !dead.has(name));
    if (live.length === 0) throw last;
    const name = live[attempt % live.length];
    const left = giveUpAt - Date.now();
    if (left <= 0) throw last;
    try {
      const response = await fetch(`${GEMINI}/${name}:generateContent`, {
        method: "POST",
        signal: AbortSignal.timeout(Math.min(attemptTimeoutMs, left)),
        headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: schema,
            // These tasks read figures rather than reason at length, and the
            // default budget costs about a minute. Only Gemini 3 takes this field.
            ...(name.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
          },
        }),
      });
      // A 4xx other than 429 means this model will not serve this request, so
      // retrying it on later rounds would only burn the deadline.
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        dead.add(name);
        throw new Error(`gemini ${response.status}`);
      }
      // A 429 is either a short burst or an exhausted daily quota. Gemini says
      // which through RetryInfo, and waiting out hours of it is pointless.
      if (response.status === 429) {
        if ((await retryDelaySeconds(response)) * 1000 > giveUpAt - Date.now()) dead.add(name);
        throw new Error("gemini 429");
      }
      if (!response.ok) throw new Error(`gemini ${response.status}`);
      const payload = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      if (!text.trim()) throw new Error("empty");
      return text;
    } catch (error) {
      last = error instanceof Error ? error : new Error(String(error));
      // A model that just dropped out is not a busy one, so move to the next
      // straight away rather than backing off for a burst that is not there.
      if (dead.has(name)) continue;
      // Wait only once every model has been tried, and cap the backoff so a
      // burst that clears early is not waited out.
      const round = Math.floor(attempt / live.length);
      const delay = attempt % live.length === live.length - 1 ? Math.min(1000 * 2 ** round, 8000) : 0;
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(delay, giveUpAt - Date.now())));
    }
  }
}

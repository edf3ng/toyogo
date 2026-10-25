const SERIES = [
  { test: /bz4x/i, slug: "bz4x" },
  { test: /\bbz\b/i, slug: "bz" },
  { test: /corolla hybrid/i, slug: "corollahybrid" },
  { test: /camry hybrid|camry hev/i, slug: "camryhybrid" },
  { test: /rav4 hybrid/i, slug: "rav4hybrid" },
  { test: /prius prime|prius plug/i, slug: "priusprime" },
  { test: /prius/i, slug: "prius" },
  { test: /camry/i, slug: "camry" },
] as const;

/** Official Toyota inventory search for a suggested model, with ZIP when we have one. */
export function buyInventoryUrl(model: string, label: string, zip?: string): string {
  const text = `${model} ${label}`;
  const slug = SERIES.find((row) => row.test.test(text))?.slug ?? "camry";
  const digits = (zip ?? "").replace(/\D/g, "").slice(0, 5);
  const url = new URL(`https://www.toyota.com/search-inventory/model/${slug}/`);
  if (digits.length === 5) url.searchParams.set("zipcode", digits);
  return url.toString();
}

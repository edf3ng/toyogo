import { writeFile, rename } from "node:fs/promises";

const BASE = "https://www.fueleconomy.gov/ws/rest";
const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const OUT = new URL("../data/epa-cache.json", import.meta.url);

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "NextMove/1.0 (hackathon demo)",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function menuItems(payload) {
  const menu = payload?.menuItem;
  if (!menu) return [];
  const list = Array.isArray(menu) ? menu : [menu];
  return list
    .filter((item) => item && item.text && item.value)
    .map((item) => ({ text: String(item.text), value: String(item.value) }));
}

function powertrain(raw) {
  const fuel2 = raw.fuelType2 || "";
  const bev = raw.fuelType1 === "Electricity";
  const phev =
    raw.phevBlended === "true" ||
    raw.phevBlended === true ||
    (fuel2 === "Electricity" && !bev && Number(raw.combE) > 0);
  if (bev) return "bev";
  if (phev) return "phev";
  if (/hybrid/i.test(raw.model || "")) return "hybrid";
  return "gas";
}

function slim(raw, trim) {
  return {
    id: String(raw.id),
    year: Number(raw.year),
    model: raw.model,
    baseModel: raw.baseModel || raw.model,
    trim,
    cityMpg: Number(raw.city08) || 0,
    highwayMpg: Number(raw.highway08) || 0,
    combinedMpg: Number(raw.comb08) || 0,
    kwhPer100: Number(raw.combE) || 0,
    co2TailpipeGpm: Number(raw.co2TailpipeGpm) || 0,
    powertrain: powertrain(raw),
    fuelType: raw.fuelType1 || "Regular Gasoline",
  };
}

async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, run));
  return results;
}

const fuelRaw = await getJson(`${BASE}/fuelprices`);
const fuelPrices = {
  regular: Number(fuelRaw.regular),
  midgrade: Number(fuelRaw.midgrade),
  premium: Number(fuelRaw.premium),
  diesel: Number(fuelRaw.diesel),
  electric: Number(fuelRaw.electric),
};

const modelsByYear = {};
const jobs = [];
for (const year of YEARS) {
  const models = menuItems(
    await getJson(`${BASE}/vehicle/menu/model?year=${year}&make=Toyota`),
  ).map((item) => item.text);
  modelsByYear[String(year)] = models;
  for (const model of models) {
    jobs.push({ year, model });
  }
  console.log(`${year}: ${models.length} models`);
}

const trimsByYearModel = {};
const vehicles = {};
let done = 0;
await pool(jobs, 8, async ({ year, model }) => {
  const key = `${year}|${model}`;
  try {
    const options = menuItems(
      await getJson(
        `${BASE}/vehicle/menu/options?year=${year}&make=Toyota&model=${encodeURIComponent(model)}`,
      ),
    );
    trimsByYearModel[key] = options.map((item) => ({ id: item.value, trim: item.text }));
    for (const option of options) {
      if (vehicles[option.value]) continue;
      const raw = await getJson(`${BASE}/vehicle/${option.value}`);
      vehicles[option.value] = slim(raw, option.text);
    }
  } catch (error) {
    console.warn("skip", key, error.message);
  }
  done += 1;
  if (done % 25 === 0) console.log(`${done}/${jobs.length}`);
});

const cache = {
  fetchedAt: new Date().toISOString(),
  fuelPrices,
  years: YEARS,
  modelsByYear,
  trimsByYearModel,
  vehicles,
};
const tmp = new URL("../data/epa-cache.tmp.json", import.meta.url);
await writeFile(tmp, JSON.stringify(cache));
await rename(tmp, OUT);
console.log(`wrote ${Object.keys(vehicles).length} vehicles`);

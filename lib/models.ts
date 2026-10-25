/** Viewer files for the cars we have a model for. Others use the Camry stand-in. */
export const MODEL_URLS = {
  camry: "/models/camry.glb?v=2",
  camryHybrid: "/models/camry-hybrid.glb?v=3",
  bz4x: "/models/bz4x.glb?v=3",
  corollaHybrid: "/models/corolla-hybrid.glb?v=1",
  fourRunner: "/models/4runner.glb?v=2",
  sienna: "/models/sienna.glb?v=1",
} as const;

export function suggestionModelUrl(model: string, label: string): string {
  const text = `${model} ${label}`;
  if (/\b4[\s-]*runner\b/i.test(text)) return MODEL_URLS.fourRunner;
  if (/\bsienna\b/i.test(text)) return MODEL_URLS.sienna;
  if (/bz4x|\bbz\b/i.test(text)) return MODEL_URLS.bz4x;
  if (/corolla hybrid/i.test(text)) return MODEL_URLS.corollaHybrid;
  if (/camry hybrid|camry hev/i.test(text)) return MODEL_URLS.camryHybrid;
  return MODEL_URLS.camry;
}

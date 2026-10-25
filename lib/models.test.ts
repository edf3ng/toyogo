import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MODEL_URLS, suggestionModelUrl } from "@/lib/models";

describe("suggestionModelUrl", () => {
  it.each(["4Runner", "4 Runner", "4-Runner", "4RUNNER Hybrid", "Toyota 4Runner TRD Pro", "4Runner Limited 4WD"])(
    "uses the supplied 4Runner for %s",
    (model) => expect(suggestionModelUrl(model, "")).toBe(MODEL_URLS.fourRunner),
  );

  it.each(["Sienna", "Sienna Hybrid", "Toyota Sienna XSE AWD", "SIENNA LE"])(
    "uses the supplied Sienna for %s",
    (model) => expect(suggestionModelUrl(model, "")).toBe(MODEL_URLS.sienna),
  );

  it.each([MODEL_URLS.fourRunner, MODEL_URLS.sienna])("ships a valid GLB container for %s", (url) => {
    const bytes = readFileSync(`public${url.split("?")[0]}`);
    expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    const json = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
    expect(json.meshes.length).toBeGreaterThan(0);
    expect(json.buffers.every((buffer: { uri?: string }) => !buffer.uri)).toBe(true);
  });

  it("preserves separate body paint and chrome in the replacement 4Runner", () => {
    const bytes = readFileSync("public/models/4runner.glb");
    const json = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
    const body = json.materials.findIndex((material: { name: string }) => material.name === "Main_Paint");
    const chrome = json.materials.findIndex((material: { name: string }) => material.name === "Chrome");
    expect(body).toBeGreaterThanOrEqual(0);
    expect(chrome).toBeGreaterThanOrEqual(0);
    expect(body).not.toBe(chrome);
    expect(json.meshes.find((mesh: { name: string }) => mesh.name === "Object_0").primitives[0].material).toBe(body);
    expect(json.meshes.find((mesh: { name: string }) => mesh.name === "Object_3").primitives[0].material).toBe(chrome);
  });

  it("uses the Camry Hybrid file for the 2024 Camry Hybrid", () => {
    expect(suggestionModelUrl("Camry Hybrid LE", "2024 Camry Hybrid")).toBe(MODEL_URLS.camryHybrid);
  });

  it("keeps the stand-in Camry for a gas Camry", () => {
    expect(suggestionModelUrl("Camry", "2024 Camry")).toBe(MODEL_URLS.camry);
  });
});

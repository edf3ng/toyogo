import { readFile, writeFile } from "node:fs/promises";
import { USDLoader } from "three/addons/loaders/USDLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const [source, destination = "public/models/4runner.glb"] = process.argv.slice(2);
if (!source) throw new Error("Usage: node scripts/convert-4runner.mjs <Toyota_4runner.usdz> [output.glb]");

// GLTFExporter uses the browser FileReader API to assemble its binary output.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};

const bytes = await readFile(source);
const scene = new USDLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
scene.traverse((object) => {
  if (!object.isMesh) return;
  object.geometry = mergeVertices(object.geometry);
  // The supplied USDZ has unnamed materials. Preserve its surfaces while
  // naming the exterior panels and windows for the viewer's paint controls.
  object.material.name = object.name === "Object_0"
    ? "CarPaint"
    : object.name === "Object_6" ? "WindowGlass" : object.name;
});
scene.userData.credit = "Toyota 4 runner model by Bobby.2024, CC BY 4.0";
scene.userData.source = "https://sketchfab.com/3d-models/toyota-4-runner-model-c6a9d632d8564526966199219b92a5cc";
const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
await writeFile(destination, Buffer.from(glb));
console.log(`Wrote ${destination} (${(glb.byteLength / 1024 / 1024).toFixed(1)} MB)`);

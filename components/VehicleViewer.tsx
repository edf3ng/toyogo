"use client";

import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ModelBoundary } from "@/components/ModelBoundary";
import { VehicleSilhouette } from "@/components/VehicleSilhouette";
import { BODY_MATERIAL_NAME } from "@/config/vehicles";

const MODEL_URL = "/models/camry.glb?v=2";

useGLTF.preload(MODEL_URL);

const GLASS = /glass|window/i;

function Car({ paint, frame }: { paint: string; frame: "trip" | "stage" | "hero" }) {
  const viewport = useThree((state) => state.size);
  const gltf = useGLTF(MODEL_URL);
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone())
        : mesh.material.clone();
    });
    return cloned;
  }, [gltf.scene]);

  useLayoutEffect(() => {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const surface = material as THREE.MeshPhysicalMaterial;
        const glass = GLASS.test(material.name);
        const glow = /glow/i.test(material.name);
        if ("emissive" in surface) {
          surface.emissive.set(glow ? "#fff1d0" : "#000000");
          surface.emissiveIntensity = glow ? 0.8 : 0;
        }
        if (material.name === BODY_MATERIAL_NAME && "color" in surface) {
          surface.map = null;
          surface.color.set(paint);
          surface.metalness = 0.62;
          surface.roughness = 0.32;
        }
        if (glass) {
          surface.transparent = true;
          surface.opacity = 0.45;
          surface.depthWrite = false;
          surface.metalness = 0.1;
          surface.roughness = 0.05;
        } else {
          surface.transparent = false;
          surface.opacity = 1;
          surface.depthWrite = true;
        }
      }
    });
  }, [paint, scene]);

  useLayoutEffect(() => {
    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, Math.PI * 0.42, 0);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    const aspect = viewport.width / Math.max(viewport.height, 1);
    const heroFit = Math.min(6.2, Math.max(3.1, 4.4 * aspect));
    const fit = frame === "hero" ? heroFit : frame === "stage" ? 4.8 : 4.2;
    const scale = fit / longest;
    scene.scale.setScalar(scale);
    scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  }, [frame, scene, viewport.height, viewport.width]);

  return <primitive object={scene} />;
}

export default function VehicleViewer({
  paint,
  frame = "trip",
}: {
  paint: string;
  frame?: "trip" | "stage" | "hero";
}) {
  const hero = frame === "hero";
  const stage = frame === "stage";
  const [spin, setSpin] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setSpin(!media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <ModelBoundary
      fallback={<VehicleSilhouette className={hero ? "h-full w-full" : stage ? "h-[70vh] min-h-[32rem]" : "h-96"} />}
    >
      <div
        role={hero ? "application" : undefined}
        aria-label={hero ? "Car model turning slowly. Drag to rotate." : undefined}
        className={
          hero
            ? "h-full w-full cursor-grab bg-white active:cursor-grabbing"
            : `w-full border border-line bg-[#efeae2] ${stage ? "h-[70vh] min-h-[32rem]" : "h-96"}`
        }
      >
        <Canvas
          camera={{
            position: hero ? [7.2, 1.7, 8.1] : stage ? [5.1, 1.9, 5.4] : [4.6, 1.75, 4.9],
            fov: hero ? 26 : 30,
          }}
          dpr={[1, 1.5]}
          gl={{ antialias: true }}
          onCreated={({ gl }) => gl.setClearColor(hero ? 0xffffff : 0xefeae2, 1)}
        >
          <color attach="background" args={[hero ? "#ffffff" : "#efeae2"]} />
          <hemisphereLight args={["#e7f2f4", "#2e3440", 0.85]} />
          <ambientLight intensity={0.45} />
          <directionalLight position={[6, 8, 4]} intensity={1.45} />
          <directionalLight position={[-4, 3, -2]} intensity={0.35} />
          <Suspense fallback={null}>
            <Car paint={paint} frame={frame} />
          </Suspense>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <circleGeometry args={[hero ? 3.15 : stage ? 3.4 : 2.8, 64]} />
            <meshStandardMaterial color={hero ? "#d4d4d4" : "#d7d1c7"} />
          </mesh>
          <OrbitControls
            autoRotate={spin}
            autoRotateSpeed={1.5}
            enablePan={false}
            enableZoom={!hero}
            enableRotate
            target={[0, hero ? 1.05 : stage ? 0.7 : 0.6, 0]}
          />
        </Canvas>
      </div>
    </ModelBoundary>
  );
}

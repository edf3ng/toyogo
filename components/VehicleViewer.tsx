"use client";

import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BODY_MATERIAL_NAME } from "@/config/vehicles";

useGLTF.preload("/models/corolla.glb");

const WHEEL_NAMES = new Set([
  "NormalCar1_BackWheels_Cube.011",
  "NormalCar1_FrontLeftWheel_Cube.007",
  "NormalCar1_FrontRightWheel_Cube.008",
]);

function onBody(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.name.startsWith("NormalCar1_Cube")) return true;
    current = current.parent;
  }
  return false;
}

function Car({
  paint,
  frame,
  rolling,
  compact,
}: {
  paint: string;
  frame: "trip" | "stage" | "hero";
  rolling: boolean;
  compact: boolean;
}) {
  const gltf = useGLTF("/models/corolla.glb");
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
      if (!mesh.isMesh || !mesh.material || !onBody(object)) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (material.name === BODY_MATERIAL_NAME && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(paint);
        }
      }
    });
  }, [paint, scene]);

  const wheels = useRef<THREE.Object3D[]>([]);
  useLayoutEffect(() => {
    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    const fit = frame === "hero" ? (compact ? 4 : 6.2) : frame === "stage" ? 4.8 : 4.2;
    const scale = fit / longest;
    scene.scale.setScalar(scale);
    scene.position.set(
      -center.x * scale,
      -center.y * scale + (size.y * scale) / 2,
      -center.z * scale,
    );
    const found: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if (WHEEL_NAMES.has(object.name)) found.push(object);
    });
    wheels.current = found;
  }, [compact, frame, scene]);

  useFrame((_, delta) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const wheel of wheels.current) {
      wheel.rotation.x -= delta * (rolling ? 7 : 1.1);
    }
  });

  return <primitive object={scene} />;
}

export default function VehicleViewer({
  paint,
  frame = "trip",
  circling = false,
  rolling = false,
  profile = false,
}: {
  paint: string;
  frame?: "trip" | "stage" | "hero";
  circling?: boolean;
  rolling?: boolean;
  profile?: boolean;
}) {
  const [reduced, setReduced] = useState(false);
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.innerWidth < 700);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const update = () => setCompact(window.innerWidth < 700);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const hero = frame === "hero";
  const stage = frame === "stage";

  return (
    <div
      className={
        hero
          ? "h-full w-full"
          : `w-full border border-line bg-[#efeae2] ${stage ? "h-[70vh] min-h-[32rem]" : "h-96"}`
      }
    >
      <Canvas
        key={`${frame}-${profile ? "side" : "three"}`}
        camera={{
          position: profile ? [-9.2, 1.45, 0.2] : stage ? [5.1, 1.9, 5.4] : hero ? [6.4, 1.85, 7.4] : [4.6, 1.75, 4.9],
          fov: hero ? 28 : 30,
        }}
        dpr={[1, 1.5]}
        gl={hero ? { alpha: true } : undefined}
        onCreated={hero ? ({ gl }) => gl.setClearColor(0x000000, 0) : undefined}
      >
        {hero ? null : <color attach="background" args={["#efeae2"]} />}
        <ambientLight intensity={0.95} />
        <directionalLight position={[4, 6, 3]} intensity={1.15} />
        <Suspense fallback={null}>
          <Car paint={paint} frame={frame} rolling={rolling} compact={compact} />
        </Suspense>
        {hero ? null : (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <circleGeometry args={[stage ? 3.4 : 2.8, 48]} />
            <meshStandardMaterial color="#d7d1c7" />
          </mesh>
        )}
        <OrbitControls
          autoRotate={circling && !reduced}
          autoRotateSpeed={0.7}
          enablePan={false}
          enableZoom={!hero}
          target={[0, hero ? 1.15 : stage ? 0.7 : 0.6, 0]}
        />
      </Canvas>
    </div>
  );
}

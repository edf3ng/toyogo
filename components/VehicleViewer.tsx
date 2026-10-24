"use client";

import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BODY_MATERIAL_NAME } from "@/config/vehicles";

useGLTF.preload("/models/corolla.glb");

const WHEEL_NAMES = new Set([
  "corolla L front tire",
  "corolla R front tire",
  "corolla back tires",
  "corolla_L_front_tire",
  "corolla_R_front_tire",
  "corolla_back_tires",
]);

function onBody(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.name === "corolla body" || current.name === "corolla_body") return true;
    current = current.parent;
  }
  return false;
}

function Car({ paint }: { paint: string }) {
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
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    const scale = 3.4 / longest;
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
  }, [scene]);

  useFrame((_, delta) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const wheel of wheels.current) {
      wheel.rotation.z -= delta * 1.1;
    }
  });

  return <primitive object={scene} />;
}

export default function VehicleViewer({ paint }: { paint: string }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div className="h-64 w-full border border-line bg-[#f3f0ea]">
      <Canvas camera={{ position: [4.2, 1.8, 4.6], fov: 35 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 3]} intensity={1.05} />
        <Suspense fallback={null}>
          <Car paint={paint} />
        </Suspense>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <circleGeometry args={[2.4, 48]} />
          <meshStandardMaterial color="#d7d1c7" />
        </mesh>
        <OrbitControls
          autoRotate={!reduced}
          autoRotateSpeed={0.6}
          enablePan={false}
          target={[0, 0.55, 0]}
        />
      </Canvas>
    </div>
  );
}

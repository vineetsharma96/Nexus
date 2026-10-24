"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "@/engine/store/useWorldStore";

export const EnergyConduits: React.FC = () => {
  const lineRef1 = useRef<THREE.Line>(null);
  const lineRef2 = useRef<THREE.Line>(null);
  const lineRef3 = useRef<THREE.Line>(null);
  const simTimeRef = useRef(0);
  const environmentSpeed = useWorldStore((state) => state.environmentSpeed);
  const isActivityPaused = useWorldStore((state) => state.isActivityPaused);

  // 1. Core -> Code City spline curve
  const curveCoreToCity = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 3, 0),
      new THREE.Vector3(-25, 4, 15),
      new THREE.Vector3(-50, 2, 28),
      new THREE.Vector3(-70, 1, 40),
    ]);
  }, []);

  // 2. Core -> Data Ocean spline curve
  const curveCoreToOcean = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 3, 0),
      new THREE.Vector3(25, 2, 15),
      new THREE.Vector3(50, -4, 28),
      new THREE.Vector3(70, -8, 40),
    ]);
  }, []);

  // 3. Core -> AI Lab spline curve
  const curveCoreToLab = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 3, 0),
      new THREE.Vector3(0, 2, 45),
      new THREE.Vector3(0, 0, 90),
      new THREE.Vector3(0, -2, 130),
    ]);
  }, []);

  const points1 = useMemo(() => curveCoreToCity.getPoints(60), [curveCoreToCity]);
  const points2 = useMemo(() => curveCoreToOcean.getPoints(60), [curveCoreToOcean]);
  const points3 = useMemo(() => curveCoreToLab.getPoints(60), [curveCoreToLab]);

  const geom1 = useMemo(() => new THREE.BufferGeometry().setFromPoints(points1), [points1]);
  const geom2 = useMemo(() => new THREE.BufferGeometry().setFromPoints(points2), [points2]);
  const geom3 = useMemo(() => new THREE.BufferGeometry().setFromPoints(points3), [points3]);

  const line1 = useMemo(
    () =>
      new THREE.Line(
        geom1,
        new THREE.LineBasicMaterial({
          color: "#10b981",
          transparent: true,
          opacity: 0.5,
        })
      ),
    [geom1]
  );
  const line2 = useMemo(
    () =>
      new THREE.Line(
        geom2,
        new THREE.LineBasicMaterial({
          color: "#8b5cf6",
          transparent: true,
          opacity: 0.5,
        })
      ),
    [geom2]
  );
  const line3 = useMemo(
    () =>
      new THREE.Line(
        geom3,
        new THREE.LineBasicMaterial({
          color: "#f59e0b",
          transparent: true,
          opacity: 0.5,
        })
      ),
    [geom3]
  );

  useFrame((_state, delta) => {
    if (!isActivityPaused) {
      simTimeRef.current += delta * environmentSpeed;
    }
    const time = simTimeRef.current;

    if (lineRef1.current) {
      const mat = lineRef1.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.35 + Math.sin(time * 3) * 0.2;
    }
    if (lineRef2.current) {
      const mat = lineRef2.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.35 + Math.sin(time * 3 + 1) * 0.2;
    }
    if (lineRef3.current) {
      const mat = lineRef3.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.35 + Math.sin(time * 3 + 2) * 0.2;
    }
  });

  return (
    <group>
      {/* Conduit: Core -> Code City (Emerald tint) */}
      <primitive object={line1} ref={lineRef1} />

      {/* Conduit: Core -> Data Ocean (Violet tint) */}
      <primitive object={line2} ref={lineRef2} />

      {/* Conduit: Core -> AI Lab (Amber tint) */}
      <primitive object={line3} ref={lineRef3} />
    </group>
  );
};

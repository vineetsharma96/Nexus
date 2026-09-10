"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Building, BuildingParams, BuildingType } from "./BuildingGenerator";
import { SeededRandom } from "../prng/SeededRandom";

export const CityLayout: React.FC = () => {
  const cityGroupRef = useRef<THREE.Group>(null);
  const circuitLinesRef = useRef<THREE.LineSegments>(null);

  const buildings = useMemo(() => {
    const prng = new SeededRandom(42918);
    const list: BuildingParams[] = [];

    // Named Hero Spires matching ZONES_METADATA.code_city.pois
    list.push({
      id: "frontend",
      name: "Interface Spire",
      type: "frontend",
      position: [-80, 0, 25],
      width: 6,
      height: 28,
      depth: 6,
      glowColor: "#00f0ff",
      hasAntenna: true,
    });

    list.push({
      id: "backend",
      name: "Compute Monolith",
      type: "backend",
      position: [-65, 0, 45],
      width: 7,
      height: 34,
      depth: 7,
      glowColor: "#10b981",
      hasAntenna: true,
    });

    list.push({
      id: "database",
      name: "Vector Vault",
      type: "database",
      position: [-55, 0, 55],
      width: 6,
      height: 22,
      depth: 6,
      glowColor: "#8b5cf6",
      hasAntenna: true,
    });

    // Seeded background urban grid
    const types: BuildingType[] = ["frontend", "backend", "database", "ai", "cloud", "security"];
    const colors = ["#00f0ff", "#10b981", "#8b5cf6", "#f59e0b", "#38bdf8", "#ec4899"];

    const cityOriginX = -70;
    const cityOriginZ = 40;
    const gridSize = 6;
    const spacing = 9;

    let index = 0;
    for (let x = -gridSize / 2; x < gridSize / 2; x++) {
      for (let z = -gridSize / 2; z < gridSize / 2; z++) {
        // Skip hero positions to avoid overlap
        const posX = cityOriginX + x * spacing + prng.range(-1.5, 1.5);
        const posZ = cityOriginZ + z * spacing + prng.range(-1.5, 1.5);

        // Distance check from hero spires
        const distHero = Math.min(
          Math.hypot(posX - -80, posZ - 25),
          Math.hypot(posX - -65, posZ - 45),
          Math.hypot(posX - -55, posZ - 55)
        );

        if (distHero > 6) {
          const typeIndex = prng.rangeInt(0, types.length - 1);
          const height = prng.range(8, 26);
          const width = prng.range(3.5, 5.5);
          const depth = prng.range(3.5, 5.5);

          list.push({
            id: `city_node_${index++}`,
            name: `${types[typeIndex].toUpperCase()} Sector Node ${index}`,
            type: types[typeIndex],
            position: [posX, 0, posZ],
            width,
            height,
            depth,
            glowColor: colors[typeIndex],
            hasAntenna: prng.boolean(0.5),
          });
        }
      }
    }

    return list;
  }, []);

  // Procedural Street Circuit Conduits
  const circuitGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const cityOriginX = -70;
    const cityOriginZ = 40;

    for (let i = -30; i <= 30; i += 9) {
      // East-West bus lines
      points.push(new THREE.Vector3(cityOriginX - 30, 0.05, cityOriginZ + i));
      points.push(new THREE.Vector3(cityOriginX + 30, 0.05, cityOriginZ + i));

      // North-South bus lines
      points.push(new THREE.Vector3(cityOriginX + i, 0.05, cityOriginZ - 30));
      points.push(new THREE.Vector3(cityOriginX + i, 0.05, cityOriginZ + 30));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame((state) => {
    if (circuitLinesRef.current) {
      const time = state.clock.getElapsedTime();
      // Flowing energy intensity in street conduits
      const mat = circuitLinesRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.25 + Math.sin(time * 2.5) * 0.15;
    }
  });

  return (
    <group ref={cityGroupRef}>
      {/* Street Conduits Grid */}
      <lineSegments ref={circuitLinesRef} geometry={circuitGeometry}>
        <lineBasicMaterial color="#00f0ff" transparent opacity={0.35} linewidth={1} />
      </lineSegments>

      {/* City Ground Base Plinth */}
      <mesh position={[-70, -0.1, 40]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[65, 65]} />
        <meshStandardMaterial color="#050914" roughness={0.9} metalness={0.5} />
      </mesh>

      {/* Buildings Array */}
      {buildings.map((b) => (
        <Building key={b.id} {...b} />
      ))}
    </group>
  );
};

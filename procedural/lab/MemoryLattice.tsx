"use client";

import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ZONES_METADATA } from "@/procedural/worldData";

export const MemoryLattice: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const [hovered, setHovered] = useState(false);
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const setSelectedPoi = useWorldStore((state) => state.setSelectedPoi);
  const environmentSpeed = useWorldStore((state) => state.environmentSpeed);

  const isSelected = selectedPoi?.id === "memory";

  // Generate 3D grid of memory nodes and connecting synapses
  const { nodePositions, lineGeometry } = useMemo(() => {
    const nodes: [number, number, number][] = [];
    const points: THREE.Vector3[] = [];
    const size = 3;
    const spacing = 1.2;

    for (let x = -size / 2; x <= size / 2; x++) {
      for (let y = -size / 2; y <= size / 2; y++) {
        for (let z = -size / 2; z <= size / 2; z++) {
          nodes.push([x * spacing, y * spacing, z * spacing]);
        }
      }
    }

    // Connect neighboring nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(
          nodes[i][0] - nodes[j][0],
          nodes[i][1] - nodes[j][1],
          nodes[i][2] - nodes[j][2]
        );
        if (d <= spacing * 1.1) {
          points.push(new THREE.Vector3(...nodes[i]));
          points.push(new THREE.Vector3(...nodes[j]));
        }
      }
    }

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return { nodePositions: nodes, lineGeometry: geom };
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime() * environmentSpeed;
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.15;
      groupRef.current.rotation.x = Math.sin(time * 0.1) * 0.1;
      groupRef.current.position.y = 1 + Math.sin(time * 1.5) * 0.2;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    const labPois = ZONES_METADATA.ai_lab.pois;
    const match = labPois.find((p) => p.id === "memory");
    if (match) setSelectedPoi(match);
  };

  const glowColor = isSelected ? "#f59e0b" : hovered ? "#8b5cf6" : "#00f0ff";

  return (
    <group
      ref={groupRef}
      position={[10, 0, 135]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
      onClick={handleClick}
    >
      <pointLight color={glowColor} intensity={hovered ? 3.0 : 1.8} distance={15} />

      {/* Synaptic Connecting Lines */}
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color={glowColor}
          transparent
          opacity={hovered || isSelected ? 0.8 : 0.35}
        />
      </lineSegments>

      {/* Memory Nodes */}
      {nodePositions.map((pos, idx) => (
        <mesh key={idx} position={pos}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={glowColor}
            emissiveIntensity={hovered ? 2.5 : 1.2}
          />
        </mesh>
      ))}
    </group>
  );
};

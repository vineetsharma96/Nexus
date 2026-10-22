"use client";

import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ZONES_METADATA } from "@/procedural/worldData";

const TOOL_MODULES = [
  { id: "tool_search", name: "SEARCH", color: "#00f0ff" },
  { id: "tool_calc", name: "CALCULATE", color: "#10b981" },
  { id: "tool_db", name: "DATABASE", color: "#8b5cf6" },
  { id: "tool_code", name: "CODE", color: "#f59e0b" },
  { id: "tool_files", name: "FILES", color: "#38bdf8" },
  { id: "tool_api", name: "API", color: "#ec4899" },
];

export const ToolsCluster: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const setSelectedPoi = useWorldStore((state) => state.setSelectedPoi);
  const environmentSpeed = useWorldStore((state) => state.environmentSpeed);

  const isSelected = selectedPoi?.id === "tools";

  useFrame((state) => {
    const time = state.clock.getElapsedTime() * environmentSpeed;
    if (groupRef.current) {
      groupRef.current.children.forEach((child, idx) => {
        child.rotation.y = time * 0.4 + idx;
        child.position.y = Math.sin(time * 2 + idx) * 0.2;
      });
      const currentScale = useWorldStore.getState().objectScale;
      const targetS = !selectedPoi || isSelected ? currentScale : 1.0;
      const nextS = THREE.MathUtils.lerp(groupRef.current.scale.x, targetS, 0.16);
      groupRef.current.scale.setScalar(nextS);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    const labPois = ZONES_METADATA.ai_lab.pois;
    const match = labPois.find((p) => p.id === "tools");
    if (match) setSelectedPoi(match);
  };

  return (
    <group
      position={[0, 1, 140]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <group ref={groupRef}>
        {TOOL_MODULES.map((tool, idx) => {
          const angle = (idx / TOOL_MODULES.length) * Math.PI * 2;
          const radius = 3.5;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const isHovered = hoveredTool === tool.id;

          return (
            <group
              key={tool.id}
              position={[x, 0, z]}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredTool(tool.id);
              }}
              onPointerOut={() => setHoveredTool(null)}
            >
              {/* Hexagonal Prism Floating Module */}
              <mesh scale={isHovered ? 1.25 : 1.0}>
                <cylinderGeometry args={[0.5, 0.5, 0.4, 6]} />
                <meshStandardMaterial
                  color="#0f172a"
                  emissive={tool.color}
                  emissiveIntensity={isHovered || isSelected ? 2.5 : 0.8}
                  roughness={0.2}
                  metalness={0.8}
                />
              </mesh>

              {/* Wireframe Outline */}
              <lineSegments scale={isHovered ? 1.28 : 1.03}>
                <edgesGeometry args={[new THREE.CylinderGeometry(0.5, 0.5, 0.4, 6)]} />
                <lineBasicMaterial color={tool.color} />
              </lineSegments>
            </group>
          );
        })}
      </group>
    </group>
  );
};

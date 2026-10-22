"use client";

import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ZONES_METADATA } from "@/procedural/worldData";

const STAGES = ["PERCEIVE", "REASON", "PLAN", "ACT", "OBSERVE"];

export const AgentObject: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);

  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const setSelectedPoi = useWorldStore((state) => state.setSelectedPoi);
  const environmentSpeed = useWorldStore((state) => state.environmentSpeed);

  const isSelected = selectedPoi?.id === "agent";

  // 5 Orbiting Stage Nodes
  const stageNodes = useMemo(() => {
    return STAGES.map((label, idx) => {
      const angle = (idx / STAGES.length) * Math.PI * 2;
      const radius = 3.2;
      return {
        label,
        index: idx,
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
      };
    });
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime() * environmentSpeed;

    // Pulse core
    if (coreRef.current) {
      coreRef.current.rotation.y = time * 0.5;
      const s = 1 + Math.sin(time * 3) * 0.08;
      coreRef.current.scale.set(s, s, s);
    }

    // Rotate stage orbit
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.y = time * 0.2;
    }

    if (groupRef.current) {
      const currentScale = useWorldStore.getState().objectScale;
      const targetS = !selectedPoi || isSelected ? currentScale : 1.0;
      const nextS = THREE.MathUtils.lerp(groupRef.current.scale.x, targetS, 0.16);
      groupRef.current.scale.setScalar(nextS);
    }

    // Advance lifecycle stage every 1.8 seconds
    const stage = Math.floor((time / 1.8) % STAGES.length);
    if (stage !== activeStageIndex) {
      setActiveStageIndex(stage);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    const labPois = ZONES_METADATA.ai_lab.pois;
    const match = labPois.find((p) => p.id === "agent");
    if (match) setSelectedPoi(match);
  };

  const glowColor = isSelected ? "#f59e0b" : hovered ? "#00f0ff" : "#38bdf8";

  return (
    <group
      ref={groupRef}
      position={[-10, 0, 125]}
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
      {/* Dynamic Agent Point Light */}
      <pointLight color={glowColor} intensity={hovered ? 3.5 : 2.0} distance={15} />

      {/* Central Cognition Sphere */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial
          color="#00f0ff"
          emissive={glowColor}
          emissiveIntensity={hovered || isSelected ? 2.5 : 1.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Orbiting Lifecycle Stage Nodes */}
      <group ref={orbitGroupRef}>
        {/* Orbital Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.2, 0.03, 16, 64]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.4} />
        </mesh>

        {stageNodes.map((node) => {
          const isActive = node.index === activeStageIndex;
          return (
            <group key={node.label} position={[node.x, 0, node.z]}>
              <mesh scale={isActive ? 1.4 : 1.0}>
                <octahedronGeometry args={[0.3, 0]} />
                <meshStandardMaterial
                  color={isActive ? "#f59e0b" : "#00f0ff"}
                  emissive={isActive ? "#f59e0b" : "#00f0ff"}
                  emissiveIntensity={isActive ? 3.0 : 0.8}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};

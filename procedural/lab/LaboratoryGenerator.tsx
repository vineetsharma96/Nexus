"use client";

import React from "react";
import { AgentObject } from "./AgentObject";
import { MemoryLattice } from "./MemoryLattice";
import { ToolsCluster } from "./ToolsCluster";

export const LaboratoryGenerator: React.FC = () => {
  return (
    <group position={[0, -2, 0]}>
      {/* 1. Laboratory Foundation Dais */}
      <mesh position={[0, -0.05, 133]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2, 22, 32]} />
        <meshStandardMaterial
          color="#050914"
          roughness={0.8}
          metalness={0.6}
        />
      </mesh>

      {/* Cyber Plinth Trim Rings */}
      <mesh position={[0, 0.01, 133]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[21.8, 22.1, 48]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 0.01, 133]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[11.8, 12.1, 48]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.3} />
      </mesh>

      {/* 2. Autonomous Agent Lifecycle Module */}
      <AgentObject />

      {/* 3. Associative Memory Lattice */}
      <MemoryLattice />

      {/* 4. Modular Tools Cluster */}
      <ToolsCluster />

      {/* 5. Ambient Lab Lighting */}
      <pointLight
        position={[0, 8, 133]}
        color="#f8fafc"
        intensity={1.5}
        distance={35}
        decay={2}
      />
    </group>
  );
};

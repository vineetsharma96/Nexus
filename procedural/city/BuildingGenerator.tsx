"use client";

import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ProceduralTextures } from "../materials/TextureGenerators";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ZONES_METADATA } from "@/procedural/worldData";
import { ProceduralAudio } from "@/engine/audio/ProceduralAudio";

export type BuildingType =
  | "frontend"
  | "backend"
  | "database"
  | "ai"
  | "cloud"
  | "security";

export interface BuildingParams {
  id: string;
  name: string;
  type: BuildingType;
  position: [number, number, number];
  width: number;
  height: number;
  depth: number;
  glowColor: string;
  hasAntenna?: boolean;
}

export const Building: React.FC<BuildingParams> = ({
  id,
  name,
  type,
  position,
  width,
  height,
  depth,
  glowColor,
  hasAntenna = true,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const setSelectedPoi = useWorldStore((state) => state.setSelectedPoi);
  const objectScale = useWorldStore((state) => state.objectScale);
  const environmentSpeed = useWorldStore((state) => state.environmentSpeed);
  const isActivityPaused = useWorldStore((state) => state.isActivityPaused);
  const simTimeRef = useRef(0);

  const isSelected = selectedPoi?.id === id;

  const windowTexture = useMemo(() => {
    return ProceduralTextures.getBuildingWindowsTexture();
  }, []);

  useFrame((_state, delta) => {
    if (!isActivityPaused) {
      simTimeRef.current += delta * environmentSpeed;
    }
    if (beaconRef.current) {
      const time = simTimeRef.current;
      // Pulsing rooftop antenna beacon
      const intensity = Math.sin(time * 6) > 0.2 ? 1 : 0.2;
      (beaconRef.current.material as THREE.MeshBasicMaterial).opacity = intensity;
    }
    if (meshRef.current) {
      const targetS = !selectedPoi || isSelected ? objectScale : 1.0;
      const nextS = THREE.MathUtils.lerp(meshRef.current.scale.x, targetS, 0.16);
      meshRef.current.scale.setScalar(nextS);
      meshRef.current.position.y = (height * nextS) / 2 + position[1];
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    ProceduralAudio.playSelect();
    const cityPois = ZONES_METADATA.code_city.pois;
    const match = cityPois.find((p) => p.id === id);
    if (match) {
      setSelectedPoi(match);
    } else {
      setSelectedPoi({
        id,
        name,
        category: "architecture",
        coordinates: position,
        description: `High-density procedural architectural node representing ${type.toUpperCase()} compute architecture.`,
        specs: {
          Type: type.toUpperCase(),
          Height: `${height.toFixed(1)}m`,
          Footprint: `${width.toFixed(1)}m x ${depth.toFixed(1)}m`,
          Telemetry: "ACTIVE CONDUIT",
        },
      });
    }
  };

  const activeColor = isSelected ? "#f59e0b" : hovered ? "#00f0ff" : glowColor;

  return (
    <group
      ref={meshRef}
      position={[position[0], height / 2 + position[1], position[2]]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        ProceduralAudio.playHover();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
      onClick={handleClick}
    >
      {/* 1. Main Monolith Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#0a0f1d"
          map={windowTexture}
          roughness={0.3}
          metalness={0.7}
          emissive={activeColor}
          emissiveIntensity={hovered || isSelected ? 0.8 : 0.15}
        />
      </mesh>

      {/* 2. Glowing Architectural Edge Trim */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width + 0.05, height + 0.05, depth + 0.05)]} />
        <lineBasicMaterial
          color={activeColor}
          linewidth={2}
          transparent
          opacity={hovered || isSelected ? 1.0 : 0.4}
        />
      </lineSegments>

      {/* 3. Rooftop Mechanical Tier / Helipad / Core */}
      <group position={[0, height / 2 + 0.5, 0]}>
        {type === "database" ? (
          // Cylindrical vector vault crown
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[width * 0.35, width * 0.4, 1.2, 16]} />
            <meshStandardMaterial
              color="#0f172a"
              emissive="#8b5cf6"
              emissiveIntensity={hovered ? 1.5 : 0.6}
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>
        ) : type === "frontend" ? (
          // Cantilevered glass observation deck
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[width * 1.15, 0.6, depth * 1.15]} />
            <meshStandardMaterial
              color="#00f0ff"
              emissive="#00f0ff"
              emissiveIntensity={0.8}
              transparent
              opacity={0.7}
            />
          </mesh>
        ) : (
          // Standard tech utility block
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[width * 0.6, 0.8, depth * 0.6]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
        )}

        {/* 4. Rooftop Transmission Antenna Needle */}
        {hasAntenna && (
          <group position={[0, 1.0, 0]}>
            <mesh position={[0, 1.5, 0]}>
              <cylinderGeometry args={[0.04, 0.12, 3, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} />
            </mesh>
            {/* Pulsing Beacon Light */}
            <mesh ref={beaconRef} position={[0, 3.1, 0]}>
              <sphereGeometry args={[0.2, 12, 12]} />
              <meshBasicMaterial color={activeColor} transparent />
            </mesh>
          </group>
        )}
      </group>

      {/* 5. Holographic Floor Plinth */}
      <mesh position={[0, -height / 2 + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[width * 0.6, width * 0.8, 16]} />
        <meshBasicMaterial
          color={activeColor}
          transparent
          opacity={hovered || isSelected ? 0.6 : 0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

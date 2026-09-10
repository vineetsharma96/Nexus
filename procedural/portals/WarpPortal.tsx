"use client";

import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { PortalShader } from "@/shaders/portal/PortalShaderMaterial";
import { ZoneId } from "@/types/world";
import { ProceduralAudio } from "@/engine/audio/ProceduralAudio";

interface WarpPortalProps {
  position: [number, number, number];
  targetZone: ZoneId;
  label: string;
  color?: string;
}

export const WarpPortal: React.FC<WarpPortalProps> = ({
  position,
  targetZone,
  label,
  color = "#00f0ff",
}) => {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const horizonRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const setZone = useWorldStore((state) => state.setZone);
  const environmentSpeed = useWorldStore((state) => state.environmentSpeed);

  // Initialize custom GLSL portal material
  const portalMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(PortalShader.uniforms),
      vertexShader: PortalShader.vertexShader,
      fragmentShader: PortalShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    mat.uniforms.uColor.value.set(color);
    return mat;
  }, [color]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime() * environmentSpeed;

    // Update portal shader time uniform
    if (portalMaterial) {
      portalMaterial.uniforms.uTime.value = time;
      portalMaterial.uniforms.uSpeed.value = hovered ? 4.0 : 2.0;
    }

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = time * 0.5;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = -time * 0.8;
    }
    if (horizonRef.current) {
      const s = 1 + Math.sin(time * 3) * 0.04;
      horizonRef.current.scale.set(s, s, s);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setZone(targetZone);
  };

  return (
    <group
      position={position}
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
      {/* Dynamic Light Source */}
      <pointLight color={color} intensity={hovered ? 4.5 : 2.2} distance={16} />

      {/* 1. Custom GLSL Relativistic Accretion Event Horizon Disc */}
      <mesh ref={horizonRef} material={portalMaterial}>
        <circleGeometry args={[2.2, 48]} />
      </mesh>

      {/* 2. Concentric Outer Segmented Ring */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[2.5, 0.08, 16, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 2.8 : 1.2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* 3. Inner Counter-Rotating Ring */}
      <mesh ref={innerRingRef}>
        <torusGeometry args={[2.1, 0.05, 16, 24]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={color}
          emissiveIntensity={2.2}
        />
      </mesh>

      {/* 4. Base Plinth */}
      <mesh position={[0, -2.6, 0]}>
        <cylinderGeometry args={[1.5, 2.0, 0.4, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.8} />
      </mesh>
    </group>
  );
};

"use client";

import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CoreParticles } from "./CoreParticles";
import { CoreShader } from "@/shaders/core/CoreShaderMaterial";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ZONES_METADATA } from "@/procedural/worldData";
import { ProceduralAudio } from "@/engine/audio/ProceduralAudio";

export const CoreGeometry: React.FC = () => {
  const coreGroupRef = useRef<THREE.Group>(null);
  const outerShellRef = useRef<THREE.Mesh>(null);
  const innerSphereRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const nodesGroupRef = useRef<THREE.Group>(null);

  const [hovered, setHovered] = useState(false);
  const setSelectedPoi = useWorldStore((state) => state.setSelectedPoi);
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const environmentSpeed = useWorldStore((state) => state.environmentSpeed);
  const isActivityPaused = useWorldStore((state) => state.isActivityPaused);
  const simTimeRef = useRef(0);

  const isSelected = selectedPoi?.id === "ai_core";

  // Create custom shader material instance
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(CoreShader.uniforms),
      vertexShader: CoreShader.vertexShader,
      fragmentShader: CoreShader.fragmentShader,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  // Generate deterministic floating orbital nodes
  const floatingNodes = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 4.2 + (i % 3) * 0.8;
      const speed = 0.4 + (i % 4) * 0.15;
      const yOffset = ((i % 5) - 2) * 0.8;
      const scale = 0.08 + (i % 3) * 0.04;
      return { id: i, angle, radius, speed, yOffset, scale };
    });
  }, []);

  useFrame((_state, delta) => {
    if (!isActivityPaused) {
      simTimeRef.current += delta * environmentSpeed;
    }
    const time = simTimeRef.current;

    // Update shader uniforms
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = time;
      const glowHex = isSelected ? "#f59e0b" : hovered ? "#00f0ff" : "#38bdf8";
      shaderMaterial.uniforms.uGlowColor.value.set(glowHex);
      shaderMaterial.uniforms.uIntensity.value = hovered || isSelected ? 1.8 : 1.2;
    }

    // Gentle global hover float & CV Pinch Scale interpolation (zero React re-renders)
    if (coreGroupRef.current) {
      coreGroupRef.current.position.y = 5 + Math.sin(time * 1.2) * 0.25;
      const targetScale = useWorldStore.getState().objectScale;
      const nextScale = THREE.MathUtils.lerp(coreGroupRef.current.scale.x, targetScale, 0.16);
      coreGroupRef.current.scale.setScalar(nextScale);
    }

    // Outer shell breathing & slow spin
    if (outerShellRef.current) {
      outerShellRef.current.rotation.y = time * 0.1;
      outerShellRef.current.rotation.z = Math.sin(time * 0.2) * 0.05;
    }

    // Inner energetic core pulsating
    if (innerSphereRef.current) {
      innerSphereRef.current.rotation.y = -time * 0.4;
      innerSphereRef.current.rotation.x = time * 0.25;
      const innerScale = 1 + Math.sin(time * 5.0) * 0.06;
      innerSphereRef.current.scale.set(innerScale, innerScale, innerScale);
    }

    // Multi-axis orbital rings
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = time * 0.35;
      ring1Ref.current.rotation.y = time * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -time * 0.45;
      ring2Ref.current.rotation.z = time * 0.3;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z = time * 0.25;
      ring3Ref.current.rotation.x = -time * 0.4;
    }

    // Orbiting data nodes
    if (nodesGroupRef.current) {
      nodesGroupRef.current.children.forEach((child, idx) => {
        const node = floatingNodes[idx];
        if (node) {
          const currentAngle = node.angle + time * node.speed;
          child.position.x = Math.cos(currentAngle) * node.radius;
          child.position.z = Math.sin(currentAngle) * node.radius;
          child.position.y = node.yOffset + Math.sin(time * 2 + idx) * 0.2;
          if (!isActivityPaused) {
            child.rotation.x += 0.02 * environmentSpeed;
            child.rotation.y += 0.03 * environmentSpeed;
          }
        }
      });
    }
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    ProceduralAudio.playHover();
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = "default";
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    ProceduralAudio.playSelect();
    const corePoi = ZONES_METADATA.core.pois.find((p) => p.id === "ai_core");
    if (corePoi) {
      setSelectedPoi(corePoi);
    }
  };

  const glowColor = isSelected ? "#f59e0b" : hovered ? "#00f0ff" : "#38bdf8";

  return (
    <group
      ref={coreGroupRef}
      position={[0, 5, 0]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Dynamic Point Light directly inside Core */}
      <pointLight
        color={glowColor}
        intensity={hovered || isSelected ? 4.5 : 2.8}
        distance={25}
        decay={2}
      />
      <pointLight
        color="#8b5cf6"
        intensity={1.5}
        position={[0, -2, 0]}
        distance={15}
        decay={2}
      />

      {/* 1. Inner Energy Nucleus */}
      <mesh ref={innerSphereRef}>
        <icosahedronGeometry args={[1.5, 3]} />
        <meshStandardMaterial
          color="#00f0ff"
          emissive={glowColor}
          emissiveIntensity={hovered || isSelected ? 3.0 : 1.8}
          roughness={0.2}
          metalness={0.8}
          wireframe={false}
        />
      </mesh>

      {/* Inner Wireframe Cage */}
      <mesh>
        <icosahedronGeometry args={[1.8, 1]} />
        <meshBasicMaterial
          color="#38bdf8"
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* 2. Outer Hero Translucent Displaced Shell (Custom GLSL) */}
      <mesh ref={outerShellRef} material={shaderMaterial}>
        <sphereGeometry args={[2.8, 32, 32]} />
      </mesh>

      {/* 3. Outer Geodesic Lattice */}
      <mesh>
        <icosahedronGeometry args={[3.2, 2]} />
        <meshBasicMaterial
          color="#00f0ff"
          wireframe
          transparent
          opacity={hovered ? 0.35 : 0.18}
        />
      </mesh>

      {/* 4. Orbital Torus Ring 1 (Equatorial) */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[3.8, 0.05, 12, 64]} />
        <meshStandardMaterial
          color="#00f0ff"
          emissive="#00f0ff"
          emissiveIntensity={2.0}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* 5. Orbital Torus Ring 2 (Tilted 45°) */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[4.6, 0.06, 12, 64]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={1.8}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* 6. Orbital Torus Ring 3 (Tilted 75°) */}
      <mesh ref={ring3Ref} rotation={[0, Math.PI / 3, Math.PI / 4]}>
        <torusGeometry args={[5.4, 0.04, 12, 64]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={1.6}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* 7. Floating Orbiting Data Nodes */}
      <group ref={nodesGroupRef}>
        {floatingNodes.map((node) => (
          <mesh key={node.id} scale={node.scale}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#00f0ff"
              emissiveIntensity={2.5}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
        ))}
      </group>

      {/* 8. Procedural Particle Cloud */}
      <CoreParticles count={1500} radius={5.8} />
    </group>
  );
};

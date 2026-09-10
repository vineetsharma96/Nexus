"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Lighting } from "./Lighting";
import { CameraRig } from "./CameraRig";
import { CoreGeometry } from "@/procedural/core/CoreGeometry";
import { CityLayout } from "@/procedural/city/CityLayout";
import { ParticleField } from "@/procedural/ocean/ParticleField";
import { LaboratoryGenerator } from "@/procedural/lab/LaboratoryGenerator";
import { WarpPortal } from "@/procedural/portals/WarpPortal";
import { EnergyConduits } from "./EnergyConduits";
import { useWorldStore } from "@/engine/store/useWorldStore";

import { AdaptiveQualityMonitor } from "@/engine/performance/AdaptiveQualityMonitor";

export const SceneManager: React.FC = () => {
  return (
    <>
      <AdaptiveQualityMonitor />
      <Lighting />
      <CameraRig />

      {/* Inter-Zone Arterial Energy Conduits */}
      <EnergyConduits />

      {/* ZONE 01: THE CORE (0, 5, 0) */}
      <CoreGeometry />

      {/* ZONE 02: CODE CITY (-70, 0, 40) */}
      <CityLayout />

      {/* ZONE 03: DATA OCEAN (70, -10, 40) */}
      <ParticleField origin={[70, -10, 40]} />

      {/* ZONE 04: AI LAB (0, -5, 130) */}
      <LaboratoryGenerator />

      {/* --- FORWARD WARP PORTALS (From Core) --- */}
      {/* Portal: Core -> Code City */}
      <WarpPortal
        position={[-28, 3, 18]}
        targetZone="code_city"
        label="CODE CITY PORTAL"
        color="#10b981"
      />

      {/* Portal: Core -> Data Ocean */}
      <WarpPortal
        position={[28, 1, 18]}
        targetZone="data_ocean"
        label="DATA OCEAN PORTAL"
        color="#8b5cf6"
      />

      {/* Portal: Core -> AI Lab */}
      <WarpPortal
        position={[0, 1, 45]}
        targetZone="ai_lab"
        label="AI LAB PORTAL"
        color="#f59e0b"
      />

      {/* --- RETURN WARP PORTALS (To Core) --- */}
      {/* Code City -> Core */}
      <WarpPortal
        position={[-50, 2, 22]}
        targetZone="core"
        label="RETURN TO CORE"
        color="#00f0ff"
      />

      {/* Data Ocean -> Core */}
      <WarpPortal
        position={[50, -4, 22]}
        targetZone="core"
        label="RETURN TO CORE"
        color="#00f0ff"
      />

      {/* AI Lab -> Core */}
      <WarpPortal
        position={[0, 0, 115]}
        targetZone="core"
        label="RETURN TO CORE"
        color="#00f0ff"
      />

      {/* Global Horizon Cyber Grid */}
      <gridHelper args={[400, 100, "#00f0ff", "#0f172a"]} position={[0, -2, 40]} />
    </>
  );
};

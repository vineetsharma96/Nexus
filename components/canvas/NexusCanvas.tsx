"use client";

import React, { Suspense, useMemo, useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { SceneManager } from "./SceneManager";
import { useWorldStore } from "@/engine/store/useWorldStore";
import Link from "next/link";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("[NEXUS WebGL] Canvas Error Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      (canvas as any).getContext("experimental-webgl")) as WebGLRenderingContext | null;
    return !!(window.WebGLRenderingContext && gl);
  } catch {
    return false;
  }
}

export const NexusCanvas: React.FC = () => {
  const qualityTier = useWorldStore((state) => state.qualityTier);
  const isArMode = useWorldStore((state) => state.isArMode);
  const isCvEnabled = useWorldStore((state) => state.isCvEnabled);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    setHasWebGL(checkWebGLSupport());
  }, []);

  const dpr = useMemo(() => {
    if (isArMode || isCvEnabled) {
      return qualityTier === "ultra" ? ([1, 1.25] as [number, number]) : 1;
    }
    switch (qualityTier) {
      case "ultra":
        return [1, 1.5] as [number, number];
      case "high":
        return [1, 1.25] as [number, number];
      case "medium":
      case "low":
      default:
        return 1;
    }
  }, [qualityTier, isArMode, isCvEnabled]);

  const webglFallback = (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712] text-center p-6 z-10 font-mono">
      <div className="w-12 h-12 rounded-full border border-amber-400/50 flex items-center justify-center text-amber-400 mb-4 animate-pulse">
        !
      </div>
      <h2 className="text-lg font-bold text-white mb-2">WEBGL ACCELERATION UNAVAILABLE</h2>
      <p className="text-xs text-slate-400 max-w-sm mb-6">
        Your browser or mobile GPU cannot allocate hardware-accelerated 3D context. Launch NEXUS Lite for the full accessible 2D interface.
      </p>
      <Link
        href="/lite"
        className="px-6 py-2.5 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs tracking-wider hover:bg-cyan-500/30 transition-all font-semibold"
      >
        ENTER NEXUS LITE (2D MODE) &rarr;
      </Link>
    </div>
  );

  if (!hasWebGL) {
    return webglFallback;
  }

  return (
    <div className="absolute inset-0 w-full h-full">
      <CanvasErrorBoundary fallback={webglFallback}>
        <Canvas
          camera={{ position: [0, 6, 18], fov: 45, near: 0.1, far: 250 }}
          dpr={dpr}
          gl={{
            alpha: true,
            antialias:
              qualityTier === "ultra" ||
              (qualityTier === "high" && !isArMode && !isCvEnabled),
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
            stencil: false,
            depth: true,
          }}
        >
          {!isArMode && <color attach="background" args={["#030712"]} />}
          <Suspense fallback={null}>
            <SceneManager />
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
};
export default NexusCanvas;

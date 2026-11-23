"use client";

import React, { useEffect, useState, useRef, useSyncExternalStore } from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";

const subscribeTouchQuery = (onChange: () => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener?.("change", onChange);
  return () => mq.removeEventListener?.("change", onChange);
};

const getIsTouchSnapshot = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;

export const CustomCursor: React.FC = () => {
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const isBooted = useWorldStore((state) => state.isBooted);

  const [isHoveringClickable, setIsHoveringClickable] = useState(false);
  const isTouchDevice = useSyncExternalStore(subscribeTouchQuery, getIsTouchSnapshot, () => false);

  const cursorRef = useRef<HTMLDivElement>(null);
  const targetPos = useRef({ x: -100, y: -100 });
  const trailingPos = useRef({ x: -100, y: -100 });

  useEffect(() => {
    if (isTouchDevice) return;

    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current.x = e.clientX;
      targetPos.current.y = e.clientY;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isPointer =
        window.getComputedStyle(target).cursor === "pointer" ||
        target.closest("button") !== null ||
        target.closest("a") !== null;
      setIsHoveringClickable((prev) => (prev === isPointer ? prev : isPointer));
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isTouchDevice]);

  // Smooth cursor trailing loop without restarting rAF on mousemove
  useEffect(() => {
    if (isTouchDevice) return;

    let animId: number;
    const updateTrailing = () => {
      trailingPos.current.x += (targetPos.current.x - trailingPos.current.x) * 0.2;
      trailingPos.current.y += (targetPos.current.y - trailingPos.current.y) * 0.2;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${trailingPos.current.x}px, ${trailingPos.current.y}px, 0) translate(-50%, -50%)`;
      }
      animId = requestAnimationFrame(updateTrailing);
    };

    animId = requestAnimationFrame(updateTrailing);
    return () => cancelAnimationFrame(animId);
  }, [isTouchDevice]);

  if (isTouchDevice || !isBooted) return null;

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none z-50 transition-[width,height,border-color] duration-200 ease-out flex items-center justify-center will-change-transform"
      style={{
        width: isHoveringClickable || selectedPoi ? "38px" : "18px",
        height: isHoveringClickable || selectedPoi ? "38px" : "18px",
      }}
    >
      {/* Outer Reticle Ring */}
      <div
        className={`w-full h-full rounded-full border transition-all duration-200 ${
          isHoveringClickable || selectedPoi
            ? "border-cyan-400 bg-cyan-400/15 shadow-[0_0_15px_rgba(0,240,255,0.6)]"
            : "border-cyan-400/50 bg-cyan-400/5"
        }`}
      />

      {/* Center Target Dot */}
      <div
        className={`absolute rounded-full transition-all duration-200 ${
          isHoveringClickable || selectedPoi
            ? "w-2 h-2 bg-white animate-ping"
            : "w-1 h-1 bg-cyan-400"
        }`}
      />

      {/* Target Lock Ticks on Interactive Hover */}
      {(isHoveringClickable || selectedPoi) && (
        <>
          <div className="absolute top-0 w-1.5 h-[1px] bg-cyan-300" />
          <div className="absolute bottom-0 w-1.5 h-[1px] bg-cyan-300" />
          <div className="absolute left-0 w-[1px] h-1.5 bg-cyan-300" />
          <div className="absolute right-0 w-[1px] h-1.5 bg-cyan-300" />
        </>
      )}
    </div>
  );
};

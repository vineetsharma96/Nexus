"use client";

import React, { useEffect, useState, useRef } from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";

export const CustomCursor: React.FC = () => {
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const isBooted = useWorldStore((state) => state.isBooted);

  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isHoveringClickable, setIsHoveringClickable] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const cursorRef = useRef<HTMLDivElement>(null);
  const trailingPos = useRef({ x: -100, y: -100 });

  useEffect(() => {
    // Detect touch device to avoid rendering desktop cursor
    if (window.matchMedia("(pointer: coarse)").matches) {
      setIsTouchDevice(true);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });

      // Check if cursor style is pointer
      const target = e.target as HTMLElement;
      const isPointer =
        window.getComputedStyle(target).cursor === "pointer" ||
        target.closest("button") !== null ||
        target.closest("a") !== null;
      setIsHoveringClickable(isPointer);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Smooth cursor trailing loop
  useEffect(() => {
    if (isTouchDevice) return;

    let animId: number;
    const updateTrailing = () => {
      trailingPos.current.x += (pos.x - trailingPos.current.x) * 0.2;
      trailingPos.current.y += (pos.y - trailingPos.current.y) * 0.2;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${trailingPos.current.x}px, ${trailingPos.current.y}px, 0) translate(-50%, -50%)`;
      }
      animId = requestAnimationFrame(updateTrailing);
    };

    animId = requestAnimationFrame(updateTrailing);
    return () => cancelAnimationFrame(animId);
  }, [pos, isTouchDevice]);

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

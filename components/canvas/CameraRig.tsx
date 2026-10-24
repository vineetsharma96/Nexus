"use client";

import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { CameraChoreographer } from "@/engine/camera/CameraChoreographer";
import { TOUR_STEPS } from "@/engine/tour/tourSequence";
import { ZoneId } from "@/types/world";

const CAMERA_WAYPOINTS: Record<ZoneId, [number, number, number, number, number, number]> = {
  core: [0, 6, 18, 0, 5, 0],
  code_city: [-70, 22, 75, -70, 8, 40],
  data_ocean: [70, 12, 72, 70, -10, 40],
  ai_lab: [0, 6, 155, 0, -5, 130],
};

export const CameraRig: React.FC = () => {
  const { camera, gl } = useThree();
  const currentZone = useWorldStore((state) => state.currentZone);
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const isReducedMotion = useWorldStore((state) => state.isReducedMotion);
  const isTourActive = useWorldStore((state) => state.isTourActive);
  const tourCurrentStep = useWorldStore((state) => state.tourCurrentStep);

  // GSAP tween targets
  const targetCamPos = useRef(new THREE.Vector3(0, 6, 18));
  const targetLookAt = useRef(new THREE.Vector3(0, 5, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 5, 0));

  // Touch gesture state
  const touchOffset = useRef({ x: 0, y: 0 });
  const touchStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastTouchTime = useRef(0);

  // Pinch-to-zoom state
  const zoomFactor = useRef(1.0);
  const initialPinchDistance = useRef<number | null>(null);

  // Pre-allocated scratch vectors for zero-GC useFrame loop
  const effectiveCamPos = useRef(new THREE.Vector3());
  const dirVec = useRef(new THREE.Vector3());

  // Auto-detect mobile devices & set initial capability tier to HIGH (PC stays ULTRA)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobileDevice =
        window.innerWidth < 768 ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

      if (isMobileDevice) {
        const currentTier = useWorldStore.getState().qualityTier;
        if (currentTier === "ultra") {
          useWorldStore.getState().setQualityTier("high");
        }
      }
    }
  }, []);

  // Trigger cinematic GSAP timeline transition on Zone, POI, or Tour Step change
  useEffect(() => {
    let destCam: [number, number, number];
    let destTarget: [number, number, number];

    if (isTourActive) {
      const step = TOUR_STEPS[tourCurrentStep] || TOUR_STEPS[0];
      destCam = step.cameraPosition;
      destTarget = step.cameraTarget;
    } else if (selectedPoi) {
      const [px, py, pz] = selectedPoi.coordinates;
      destCam = [px, py + 3.5, pz + 11];
      destTarget = [px, py, pz];
    } else {
      const waypoint = CAMERA_WAYPOINTS[currentZone] || CAMERA_WAYPOINTS.core;
      destCam = [waypoint[0], waypoint[1], waypoint[2]];
      destTarget = [waypoint[3], waypoint[4], waypoint[5]];
    }

    CameraChoreographer.transitionTo(destCam, destTarget, {
      camera,
      targetCamPosRef: targetCamPos,
      targetLookAtRef: targetLookAt,
      isReducedMotion,
      onComplete: () => {
        // Reset local touch offsets on complete transition
        touchOffset.current = { x: 0, y: 0 };
        zoomFactor.current = 1.0;
      },
    });
  }, [currentZone, selectedPoi, isTourActive, tourCurrentStep, isReducedMotion, camera]);

  // Touch gesture listeners: Drag, Pinch-to-Zoom, and Double-Tap
  useEffect(() => {
    const dom = gl.domElement;

    const handleTouchStart = (e: TouchEvent) => {
      const now = Date.now();

      // Double-tap detection
      if (now - lastTouchTime.current < 300) {
        touchOffset.current = { x: 0, y: 0 };
        zoomFactor.current = 1.0;
      }
      lastTouchTime.current = now;

      if (e.touches.length === 1) {
        isDragging.current = true;
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        initialPinchDistance.current = null;
      } else if (e.touches.length === 2) {
        // Initialize pinch distance
        isDragging.current = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance.current = Math.hypot(dx, dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging.current) {
        const dx = (e.touches[0].clientX - touchStart.current.x) * 0.012;
        const dy = (e.touches[0].clientY - touchStart.current.y) * 0.012;
        touchOffset.current.x = THREE.MathUtils.clamp(touchOffset.current.x + dx, -6, 6);
        touchOffset.current.y = THREE.MathUtils.clamp(touchOffset.current.y - dy, -4, 4);
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && initialPinchDistance.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const deltaDist = currentDist - initialPinchDistance.current;

        // Scale zoom smoothly
        const nextZoom = zoomFactor.current - deltaDist * 0.005;
        zoomFactor.current = THREE.MathUtils.clamp(nextZoom, 0.6, 2.2);
        initialPinchDistance.current = currentDist;
      }
    };

    const handleTouchEnd = () => {
      isDragging.current = false;
      initialPinchDistance.current = null;
    };

    dom.addEventListener("touchstart", handleTouchStart, { passive: true });
    dom.addEventListener("touchmove", handleTouchMove, { passive: true });
    dom.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      dom.removeEventListener("touchstart", handleTouchStart);
      dom.removeEventListener("touchmove", handleTouchMove);
      dom.removeEventListener("touchend", handleTouchEnd);
    };
  }, [gl]);

  useFrame((state) => {
    const camPos = effectiveCamPos.current.copy(targetCamPos.current);

    // Desktop pointer parallax & Mobile touch drag
    if (!isReducedMotion && !isTourActive) {
      camPos.x += state.pointer.x * 1.5 + touchOffset.current.x;
      camPos.y += state.pointer.y * 1.0 + touchOffset.current.y;

      // Apply pinch zoom scale relative to target lookAt
      dirVec.current.copy(camPos).sub(currentLookAt.current);
      camPos.copy(currentLookAt.current).add(dirVec.current.multiplyScalar(zoomFactor.current));
    }

    // Slow orbital drift when tour is active
    if (isTourActive) {
      const time = state.clock.getElapsedTime();
      camPos.x += Math.sin(time * 0.3) * 0.8;
      camPos.y += Math.cos(time * 0.2) * 0.4;
    }

    // Smooth continuous spring lerp
    camera.position.lerp(camPos, 0.06);
    currentLookAt.current.lerp(targetLookAt.current, 0.06);
    camera.lookAt(currentLookAt.current);
  });

  return null;
};

"use client";

import React from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ZONES_METADATA } from "@/procedural/worldData";

/**
 * ScreenReaderLive announces spatial state transitions, active points of interest,
 * and tour steps to assistive screen readers via an ARIA live region.
 */
export const ScreenReaderLive: React.FC = () => {
  const currentZone = useWorldStore((state) => state.currentZone);
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const isTourActive = useWorldStore((state) => state.isTourActive);
  const tourCurrentStep = useWorldStore((state) => state.tourCurrentStep);
  const isBooted = useWorldStore((state) => state.isBooted);

  let announcement = "";
  if (isBooted) {
    if (isTourActive) {
      announcement = `AI Tour Step ${tourCurrentStep + 1} active in ${ZONES_METADATA[currentZone].name}.`;
    } else if (selectedPoi) {
      announcement = `Selected point of interest: ${selectedPoi.name}. ${selectedPoi.description}`;
    } else {
      announcement = `Navigated to ${ZONES_METADATA[currentZone].name}. ${ZONES_METADATA[currentZone].tagline}`;
    }
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

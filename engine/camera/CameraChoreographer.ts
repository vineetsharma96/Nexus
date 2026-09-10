import gsap from "gsap";
import * as THREE from "three";
import { ZoneId } from "@/types/world";

export interface CameraTransitionConfig {
  camera: THREE.Camera;
  targetLookAtRef: React.MutableRefObject<THREE.Vector3>;
  targetCamPosRef: React.MutableRefObject<THREE.Vector3>;
  isReducedMotion: boolean;
  onComplete?: () => void;
}

export class CameraChoreographer {
  /**
   * Executes a cinematic GSAP timeline transition between zones or points of interest
   */
  static transitionTo(
    destCam: [number, number, number],
    destTarget: [number, number, number],
    config: CameraTransitionConfig
  ) {
    const { targetCamPosRef, targetLookAtRef, isReducedMotion, onComplete } = config;

    // In reduced motion mode, instantly position the targets without high-velocity sweeps
    if (isReducedMotion) {
      targetCamPosRef.current.set(destCam[0], destCam[1], destCam[2]);
      targetLookAtRef.current.set(destTarget[0], destTarget[1], destTarget[2]);
      if (onComplete) onComplete();
      return;
    }

    // Kill any conflicting ongoing tweens
    gsap.killTweensOf(targetCamPosRef.current);
    gsap.killTweensOf(targetLookAtRef.current);

    const tl = gsap.timeline({
      onComplete,
    });

    // Animate camera position along smooth power2/power3 curve
    tl.to(
      targetCamPosRef.current,
      {
        x: destCam[0],
        y: destCam[1],
        z: destCam[2],
        duration: 1.6,
        ease: "power3.inOut",
      },
      0
    );

    // Animate look-at focus target simultaneously
    tl.to(
      targetLookAtRef.current,
      {
        x: destTarget[0],
        y: destTarget[1],
        z: destTarget[2],
        duration: 1.4,
        ease: "power2.out",
      },
      0.1
    );
  }
}

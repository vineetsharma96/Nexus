import { describe, expect, test, mock, spyOn, beforeEach, afterEach } from "bun:test";
import gsap from "gsap";
import * as THREE from "three";
import { CameraChoreographer, CameraTransitionConfig } from "../CameraChoreographer";

describe("CameraChoreographer", () => {
  let targetCamPosRef: any;
  let targetLookAtRef: any;
  let camera: any;
  let config: CameraTransitionConfig;

  beforeEach(() => {
    targetCamPosRef = {
      current: new THREE.Vector3(0, 0, 0),
    };
    targetLookAtRef = {
      current: new THREE.Vector3(0, 0, 0),
    };
    camera = new THREE.PerspectiveCamera();

    config = {
      camera,
      targetCamPosRef,
      targetLookAtRef,
      isReducedMotion: false,
    };
  });

  afterEach(() => {
    mock.restore();
  });

  test("instantly sets positions and calls onComplete when isReducedMotion is true", () => {
    const onComplete = mock();
    config.isReducedMotion = true;
    config.onComplete = onComplete;

    const killTweensOfSpy = spyOn(gsap, 'killTweensOf');

    CameraChoreographer.transitionTo([10, 20, 30], [5, 5, 5], config);

    expect(targetCamPosRef.current.x).toBe(10);
    expect(targetCamPosRef.current.y).toBe(20);
    expect(targetCamPosRef.current.z).toBe(30);

    expect(targetLookAtRef.current.x).toBe(5);
    expect(targetLookAtRef.current.y).toBe(5);
    expect(targetLookAtRef.current.z).toBe(5);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(killTweensOfSpy).not.toHaveBeenCalled();
  });

  test("uses GSAP timeline for transitions when isReducedMotion is false", () => {
    const killTweensOfSpy = spyOn(gsap, 'killTweensOf').mockImplementation(() => {});

    const mockTl = {
      to: mock()
    };
    const timelineSpy = spyOn(gsap, 'timeline').mockReturnValue(mockTl as any);
    const onComplete = mock();
    config.onComplete = onComplete;

    CameraChoreographer.transitionTo([10, 20, 30], [5, 5, 5], config);

    expect(killTweensOfSpy).toHaveBeenCalledTimes(2);
    expect(killTweensOfSpy).toHaveBeenNthCalledWith(1, targetCamPosRef.current);
    expect(killTweensOfSpy).toHaveBeenNthCalledWith(2, targetLookAtRef.current);

    expect(timelineSpy).toHaveBeenCalledWith({ onComplete });

    expect(mockTl.to).toHaveBeenCalledTimes(2);

    // First call is for camera position
    expect(mockTl.to).toHaveBeenNthCalledWith(1, targetCamPosRef.current, {
      x: 10,
      y: 20,
      z: 30,
      duration: 1.6,
      ease: "power3.inOut",
    }, 0);

    // Second call is for look-at target
    expect(mockTl.to).toHaveBeenNthCalledWith(2, targetLookAtRef.current, {
      x: 5,
      y: 5,
      z: 5,
      duration: 1.4,
      ease: "power2.out",
    }, 0.1);
  });
});

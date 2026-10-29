import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { ProceduralAudio } from "../ProceduralAudio";
import { useWorldStore } from "@/engine/store/useWorldStore";

describe("ProceduralAudio", () => {
  // Web Audio API Mocks
  class MockAudioParam {
    value = 0;
    setValueAtTime = mock();
    exponentialRampToValueAtTime = mock();
    linearRampToValueAtTime = mock();
  }

  class MockAudioNode {
    connect = mock();
    disconnect = mock();
  }

  class MockOscillatorNode extends MockAudioNode {
    type = "sine";
    frequency = new MockAudioParam();
    start = mock();
    stop = mock();
  }

  class MockGainNode extends MockAudioNode {
    gain = new MockAudioParam();
  }

  class MockBiquadFilterNode extends MockAudioNode {
    type = "lowpass";
    frequency = new MockAudioParam();
  }

  class MockAudioContext {
    state = "running";
    currentTime = 0;
    destination = {};
    createOscillator = mock(() => new MockOscillatorNode());
    createGain = mock(() => new MockGainNode());
    createBiquadFilter = mock(() => new MockBiquadFilterNode());
    resume = mock(() => Promise.resolve());
  }

  let originalWindow: any;

  beforeEach(() => {
    // Reset Zustand store state to unmuted for most tests
    useWorldStore.setState({ isAudioMuted: false });

    // Setup global window mock for AudioContext
    originalWindow = global.window;
    global.window = {
      AudioContext: MockAudioContext
    } as any;

    // Hack to reset static state of ProceduralAudio by accessing it via any
    const PA = ProceduralAudio as any;
    PA.ctx = null;
    PA.ambientOsc1 = null;
    PA.ambientOsc2 = null;
    PA.ambientGain = null;
  });

  afterEach(() => {
    global.window = originalWindow;
    mock.restore();
  });

  it("should not play hover sound if muted", () => {
    useWorldStore.setState({ isAudioMuted: true });
    ProceduralAudio.playHover();
    const ctx = (ProceduralAudio as any).ctx;
    expect(ctx).toBeNull();
  });

  it("should play hover sound when not muted", () => {
    ProceduralAudio.playHover();
    const ctx = (ProceduralAudio as any).ctx;
    expect(ctx).not.toBeNull();
    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createGain).toHaveBeenCalled();
  });

  it("should not play select sound if muted", () => {
    useWorldStore.setState({ isAudioMuted: true });
    ProceduralAudio.playSelect();
    const ctx = (ProceduralAudio as any).ctx;
    expect(ctx).toBeNull();
  });

  it("should play select sound when not muted", () => {
    ProceduralAudio.playSelect();
    const ctx = (ProceduralAudio as any).ctx;
    expect(ctx).not.toBeNull();
    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createGain).toHaveBeenCalled();
  });

  it("should play portal warp sound when not muted", () => {
    ProceduralAudio.playPortalWarp();
    const ctx = (ProceduralAudio as any).ctx;
    expect(ctx).not.toBeNull();
    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createGain).toHaveBeenCalled();
    expect(ctx.createBiquadFilter).toHaveBeenCalled();
  });

  it("should play AI response sound when not muted", () => {
    ProceduralAudio.playAIResponse();
    const ctx = (ProceduralAudio as any).ctx;
    expect(ctx).not.toBeNull();
    // 2 oscillators for this one
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    expect(ctx.createGain).toHaveBeenCalled();
  });

  it("should play boot sound when not muted", () => {
    ProceduralAudio.playBoot();
    const ctx = (ProceduralAudio as any).ctx;
    expect(ctx).not.toBeNull();
    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createGain).toHaveBeenCalled();
  });

  it("should start ambient drone", () => {
    ProceduralAudio.startAmbient();
    const PA = ProceduralAudio as any;
    expect(PA.ambientOsc1).not.toBeNull();
    expect(PA.ambientOsc2).not.toBeNull();
    expect(PA.ambientGain).not.toBeNull();
    expect(PA.ctx).not.toBeNull();
    expect(PA.ctx.createOscillator).toHaveBeenCalledTimes(2);
    expect(PA.ctx.createBiquadFilter).toHaveBeenCalledTimes(1);
    expect(PA.ctx.createGain).toHaveBeenCalledTimes(1);
  });

  it("should stop ambient drone", async () => {
    ProceduralAudio.startAmbient();
    const PA = ProceduralAudio as any;

    expect(PA.ambientOsc1).not.toBeNull();
    const stopSpy1 = spyOn(PA.ambientOsc1, "stop");
    const stopSpy2 = spyOn(PA.ambientOsc2, "stop");

    ProceduralAudio.stopAmbient();
    expect(PA.ambientGain.gain.linearRampToValueAtTime).toHaveBeenCalled();

    // Fast forward setTimeout
    await new Promise(resolve => setTimeout(resolve, 860));

    expect(stopSpy1).toHaveBeenCalled();
    expect(stopSpy2).toHaveBeenCalled();
    expect(PA.ambientOsc1).toBeNull();
    expect(PA.ambientOsc2).toBeNull();
    expect(PA.ambientGain).toBeNull();
  });

  it("should toggle ambient drone based on mute state", () => {
    const startSpy = spyOn(ProceduralAudio, "startAmbient");
    const stopSpy = spyOn(ProceduralAudio, "stopAmbient");

    ProceduralAudio.toggleAmbient(true);
    expect(stopSpy).toHaveBeenCalled();
    expect(startSpy).not.toHaveBeenCalled();

    stopSpy.mockClear();

    ProceduralAudio.toggleAmbient(false);
    expect(startSpy).toHaveBeenCalled();
    expect(stopSpy).not.toHaveBeenCalled();
  });

  it("should resume context if suspended", () => {
    global.window = {
      AudioContext: class extends MockAudioContext {
        state = "suspended";
      }
    } as any;

    ProceduralAudio.playHover();
    const ctx = (ProceduralAudio as any).ctx;
    expect(ctx.resume).toHaveBeenCalled();
  });

  it("should handle lack of window gracefully", () => {
    global.window = undefined as any;
    ProceduralAudio.playHover();
    const ctx = (ProceduralAudio as any).ctx;
    expect(ctx).toBeNull();
  });
});

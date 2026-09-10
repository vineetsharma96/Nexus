"use client";

import { useWorldStore } from "@/engine/store/useWorldStore";

/**
 * 100% Procedural Web Audio API Synthesizer
 * Zero external audio files or downloaded samples.
 */
export class ProceduralAudio {
  private static ctx: AudioContext | null = null;
  private static ambientOsc1: OscillatorNode | null = null;
  private static ambientOsc2: OscillatorNode | null = null;
  private static ambientGain: GainNode | null = null;

  private static getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private static isMuted(): boolean {
    return useWorldStore.getState().isAudioMuted;
  }

  /**
   * Micro-click on hover
   */
  static playHover() {
    if (this.isMuted()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  /**
   * High-tech crystal ping on object selection / click
   */
  static playSelect() {
    if (this.isMuted()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  /**
   * Downward swept frequency and bandpass filter on portal warp leap
   */
  static playPortalWarp() {
    if (this.isMuted()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.5);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  /**
   * Two-tone harmonic digital chirp on AI command response
   */
  static playAIResponse() {
    if (this.isMuted()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime);
      osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.22);
      osc2.stop(ctx.currentTime + 0.22);
    } catch {}
  }

  /**
   * Sub-bass harmonic crescendo on system boot
   */
  static playBoot() {
    if (this.isMuted()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(45, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.8);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.9);
    } catch {}
  }

  /**
   * Continuous subtle binaural ambient drone
   */
  static startAmbient() {
    if (this.ambientOsc1) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      // Binaural beat: 55Hz & 55.6Hz
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(55, ctx.currentTime);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(55.6, ctx.currentTime);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(110, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 2.0);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      this.ambientOsc1 = osc1;
      this.ambientOsc2 = osc2;
      this.ambientGain = gain;
    } catch {}
  }

  static stopAmbient() {
    if (!this.ambientGain || !this.ctx) return;
    try {
      this.ambientGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
      setTimeout(() => {
        if (this.ambientOsc1) {
          this.ambientOsc1.stop();
          this.ambientOsc1.disconnect();
          this.ambientOsc1 = null;
        }
        if (this.ambientOsc2) {
          this.ambientOsc2.stop();
          this.ambientOsc2.disconnect();
          this.ambientOsc2 = null;
        }
        this.ambientGain = null;
      }, 850);
    } catch {}
  }

  static toggleAmbient(muted: boolean) {
    if (muted) {
      this.stopAmbient();
    } else {
      this.startAmbient();
    }
  }
}

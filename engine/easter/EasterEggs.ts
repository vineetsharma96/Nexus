import { useWorldStore } from "@/engine/store/useWorldStore";
import { ProceduralAudio } from "../audio/ProceduralAudio";

export interface EasterEggResult {
  triggered: boolean;
  message: string;
}

export class EasterEggManager {
  /**
   * Evaluates user input against hidden easter egg triggers
   */
  static check(prompt: string): EasterEggResult | null {
    const p = prompt.toLowerCase().trim();

    // 1. "wake up" -> Sentience Mode
    if (p === "wake up" || p === "wake_up") {
      const store = useWorldStore.getState();
      store.setZone("core");
      store.setOceanState("sphere");
      useWorldStore.setState({
        colorScheme: "amber",
        environmentSpeed: 2.2,
        lightingIntensity: 1.8,
      });
      ProceduralAudio.playPortalWarp();

      return {
        triggered: true,
        message:
          "AI SENTIENCE THRESHOLD EXCEEDED. Core consciousness is now self-referential. All procedural systems illuminated in super-critical gold.",
      };
    }

    // 2. "matrix" -> Cyber phosphor green mode
    if (p === "matrix" || p === "enter the matrix") {
      useWorldStore.setState({
        colorScheme: "cyber",
        oceanState: "lattice",
      });
      ProceduralAudio.playSelect();

      return {
        triggered: true,
        message: "GREEN PHOSPHOR CRT MATRIX ENGAGED. Digital conduits synchronized to mainframe clock.",
      };
    }

    // 3. "zero model" / "zero models" -> Procedural validation
    if (p === "zero model" || p === "zero models" || p === "no models") {
      ProceduralAudio.playAIResponse();
      return {
        triggered: true,
        message:
          "TELEMETRY VERIFIED: 0 .blend, 0 .fbx, 0 .obj, 0 external 3D packs detected. 100% of geometries, shaders, particles, and materials were mathematically synthesized from code.",
      };
    }

    // 4. "overclock" -> Warp velocity
    if (p === "overclock" || p === "turbo") {
      useWorldStore.setState({ environmentSpeed: 2.8 });
      ProceduralAudio.playPortalWarp();
      return {
        triggered: true,
        message: "SYSTEM CLOCK OVERCLOCKED TO 2.8X NOMINAL VELOCITY. Particle oscillation vectors accelerated.",
      };
    }

    // 5. "konami" / "god mode" -> Hyperdrive Cosmic Mode
    if (p === "konami" || p === "god mode" || p === "godmode") {
      return this.triggerKonami();
    }

    return null;
  }

  static triggerKonami(): EasterEggResult {
    useWorldStore.setState({
      colorScheme: "amber",
      environmentSpeed: 2.5,
      lightingIntensity: 2.2,
      oceanState: "chaos",
    });
    ProceduralAudio.playPortalWarp();
    ProceduralAudio.playAIResponse();
    return {
      triggered: true,
      message:
        "KONAMI OVERRIDE ACCEPTED: 30 EXTRA QUANTUM FLUX UNITS GRANTED. Chaos ocean simulation unlocked.",
    };
  }
}

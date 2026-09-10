# NEXUS: AI-Native Procedural Spatial Interface

> *"An interface between humans, intelligence, and digital space."*

**NEXUS** is an immersive, futuristic, AI-native 3D web experience where the digital world itself is the primary interface. Built with **Next.js 16 (App Router + Turbopack)**, **React 19**, **Three.js**, and **React Three Fiber**, NEXUS renders an expansive, living, computational universe entirely in real-time.

---

## ⚡ The Zero-External-Model Constraint

NEXUS enforces an absolute design constraint: **ZERO EXTERNAL 3D MODELS**.
- 🚫 **No Blender, Maya, 3ds Max, C4D, or SketchUp assets**.
- 🚫 **Zero `.blend`, `.fbx`, `.obj`, `.gltf`, or `.glb` files**.
- 🚫 **Zero pre-packaged asset packs or downloaded audio samples**.
- ✅ **100% of geometries, textures, materials, particle fields, GLSL shaders, and audio effects are synthesized mathematically in code**.

---

## 🌌 The 4-Zone Procedural Universe

```
                           [ THE AI CORE ]
                           Coords: [0, 5, 0]
                      Simplex Noise & Fresnel Glow
                                    │
               ┌────────────────────┼────────────────────┐
               │                    │                    │
               ▼                    ▼                    ▼
        [ CODE CITY ]        [ DATA OCEAN ]        [ AI LABORATORY ]
     Coords: [0, 0, -120]  Coords: [150, -5, 0]   Coords: [-150, 0, 0]
      48 Monolith Towers   40,000 Particle Field    Agent State Matrix
     Procedural PCB Grid    4 Harmonic Topologies  3D Memory Knowledge
```

1. **The AI Core (`[0, 5, 0]`)**:
   - Central pulsating nucleus with 3-axis gyro orbital rings, dynamic simplex noise vertex displacement, physical Fresnel rim dispersion, and 1,500 orbiting data nodes.
2. **Code City (`[0, 0, -120]`)**:
   - Algorithmic metropolis synthesized via Mulberry32 deterministic PRNG. Features 48 monolithic skyscrapers with procedurally drawn window grids and PCB circuit textures, reaching up to 45m hero spires.
3. **Data Ocean (`[150, -5, 0]`)**:
   - Mathematical ocean of up to 40,000 instanced particles capable of real-time geometric morphing between 4 distinct mathematical topologies: **Wave**, **Sphere**, **Lattice**, and **Chaos**.
4. **AI Laboratory (`[-150, 0, 0]`)**:
   - Neural experimentation grounds featuring an Autonomous Agent lifecycle matrix (Perception $\to$ Deliberation $\to$ Action), an interactive 3D Memory Lattice graph, and 6 orbiting modular developer tools.

---

## 🤖 AI Natural Language Command Engine

NEXUS features a dual-provider conversational interface:
- **Online Generative Reasoning**: Integrated with **Google Gemini** (`GeminiProvider.ts`) utilizing structured JSON mode for guaranteed schema adherence.
- **Offline Heuristic Engine**: Zero-network fallback provider (`FallbackProvider.ts`) with natural language intent parsing and keyword extraction.
- **Strict Zod Validation**: Every action is parsed against `SceneCommandSchema` before sandboxed execution in `SceneController.ts`.
- **Zero Unsafe Primitives**: **Zero `eval()`**, **zero `new Function()`**, and **zero `innerHTML`**.

### Try These Terminal Commands:
- `"Take me to the AI Laboratory"` $\to$ Jumps to Zone 4.
- `"Morph ocean into a crystal lattice"` $\to$ Transforms 40,000 particles into quantum lattice formation.
- `"Overclock physics speed to 2.5x"` $\to$ Accelerates procedural oscillation velocities.
- `"Set atmosphere to amber"` $\to$ Transitions global lighting and ambient glows.
- `"Explain the AI Core"` $\to$ Provides real-time spatial architectural breakdown.

---

## 🔊 100% Procedural Web Audio API Synthesizer

Zero external MP3/WAV samples. All sound effects are synthesized in real-time on the client:
- **Hover Micro-Ticks**: 40ms high-frequency frequency sweeps on interactive nodes.
- **Selection Ping**: High-tech upward crystalline sweep ($880\text{ Hz} \to 1760\text{ Hz}$).
- **Portal Warp Leap**: Doppler-effect lowpass swept sawtooth oscillator on inter-zone jumps.
- **AI Cognitive Chirp**: Harmonic two-tone chord on command responses.
- **System Boot Crescendo**: Resonant sub-bass harmonic sweep upon initialization.
- **Binaural Mainframe Hum**: Continuous $55\text{ Hz} / 55.6\text{ Hz}$ binaural ambient drone (toggled via HUD or `M` key).

---

## 🕹️ Hidden Easter Eggs

Integrated into the AI Terminal and keyboard listeners:
- Type **`"wake up"`**: Super-critical AI sentience threshold, shifts world to golden amber, accelerates physics.
- Type **`"matrix"`**: Phosphor-green CRT cyber mode with lattice particle ocean.
- Type **`"zero model"`**: Live procedural telemetry audit verifying 0 external asset packs.
- Type **`"overclock"`**: Turbocharges system clock to $2.8\times$ nominal velocity.
- Konami Code (**`↑ ↑ ↓ ↓ ← → ← → B A`**) / **`"god mode"`**: Unlocks chaotic particle physics and grants 30 extra quantum flux units.

---

## ♿ Accessibility & NEXUS Lite

- **NEXUS Lite (`/lite`)**: Accessible 2D SVG/Canvas mode for low-spec hardware or screen readers without WebGL requirements.
- **ARIA Live Announcer**: Polite live announcements on zone shifts, POI inspections, and guided tours.
- **Keyboard Navigation Matrix**:
  - `1 - 4`: Jump directly between Core, City, Ocean, and Lab.
  - `Space`: Inspect zone primary node.
  - `/` or `T`: Toggle AI Terminal.
  - `M`: Toggle procedural audio synthesis.
  - `?`: View shortcuts modal.
- **Reduced Motion Support**: Automatic dampening on `(prefers-reduced-motion: reduce)`.

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/your-repo/nexus.git
cd nexus
npm install
```

### 2. Environment Variables (Optional)
Create `.env.local`:
```env
# Optional: Add your Google Gemini API key for online generative reasoning
GEMINI_API_KEY=your_api_key_here
```
*(If omitted, NEXUS automatically runs seamlessly via its offline heuristic engine).*

### 3. Run Development Server
```bash
npm run dev
# Open http://localhost:3000
```

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 📚 Technical Documentation

Detailed architectural and procedural subsystem documentation:
- [System Architecture](file:///docs/architecture.md)
- [Procedural Generation Engine](file:///docs/procedural-generation.md)
- [AI Command & Schema Pipeline](file:///docs/ai-system.md)
- [Custom GLSL Shaders](file:///docs/shader-system.md)
- [Performance & Adaptive Quality](file:///docs/performance.md)
- [Accessibility & Inclusive Design](file:///docs/accessibility.md)
- [Production Deployment](file:///docs/deployment.md)

---

## 📄 License
MIT License. Built with Next.js, Three.js, and React Three Fiber.

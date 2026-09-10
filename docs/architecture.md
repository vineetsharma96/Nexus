# NEXUS Architecture & System Design

NEXUS is an immersive, futuristic, AI-native 3D web application where the digital world itself is the primary user interface ("An interface between humans, intelligence, and digital space").

---

## 1. High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             BROWSER VIEWPORT                             │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    2D HUD & INTERACTION OVERLAYS                   │  │
│  │  - BootScreen       - TelemetryHUD        - AI Terminal            │  │
│  │  - TourOverlay      - SandboxControls     - MobileNavControls      │  │
│  │  - CustomCursor     - WarpFlash           - InspectModal           │  │
│  │  - ShortcutsModal   - ScreenReaderLive    - AccessibilityControls  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                   │                                      │
│                                   ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                     ZUSTAND WORLD STORE ENGINE                     │  │
│  │   - Active Zone & Transition Targets (Core, City, Ocean, Lab)      │  │
│  │   - Camera Look-at & Coordinates   - Ocean Topology States         │  │
│  │   - Environment Physics Speed      - Dynamic Lighting Intensity    │  │
│  │   - Performance Tier (Ultra..Low)  - Audio State (Web Audio API)   │  │
│  │   - AI Command Execution State     - Inspection POI Metadata       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                   │                                      │
│                                   ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │             REACT THREE FIBER (R3F) & THREE.JS ENGINE              │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ CameraRig (GSAP Timeline + Parallax + Touch Orbit/Pinch)     │  │  │
│  │  ├──────────────────────────────────────────────────────────────┤  │  │
│  │  │ EnergyConduits (Catmull-Rom Spline Particle Conduits)        │  │  │
│  │  ├──────────────────────────────────────────────────────────────┤  │  │
│  │  │ Zone 1: AI Core (Inner Nucleus + Outer Cage + Orbital Rings) │  │  │
│  │  ├──────────────────────────────────────────────────────────────┤  │  │
│  │  │ Zone 2: Code City (Mulberry32 PRNG 48 Monoliths + Spire)    │  │  │
│  │  ├──────────────────────────────────────────────────────────────┤  │  │
│  │  │ Zone 3: Data Ocean (40,000 Particle Harmonic Vector Matrix)  │  │  │
│  │  ├──────────────────────────────────────────────────────────────┤  │  │
│  │  │ Zone 4: AI Laboratory (Agent Lifecycle + Memory Lattice)     │  │  │
│  │  ├──────────────────────────────────────────────────────────────┤  │  │
│  │  │ Inter-Zone Warp Portals (Relativistic Accretion Shaders)    │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                   │                                      │
│                                   ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                 AI REASONING & COMMAND SUBSYSTEM                   │  │
│  │  - Client: Terminal UI + SceneController Sandboxed Dispatcher      │  │
│  │  - Server: /api/ai/command + /api/ai/explain (Rate-limited, Zod)   │  │
│  │  - Provider: GeminiProvider (JSON Mode) + FallbackHeuristicProvider │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Constraints & Guiding Principles

1. **Zero External 3D Models**:
   - Strictly 0 `.blend`, `.obj`, `.fbx`, `.gltf`, `.glb`, or pre-packaged 3D asset packs.
   - 100% of geometries (icosahedrons, cylinders, boxes, custom Catmull-Rom curves), GLSL shaders, textures (canvas-drawn PCB and window grids), and particle fields are synthesized programmatically in code.
2. **Zero Insecure Dynamic Execution**:
   - Zero `eval()`, zero `new Function()`, and zero `innerHTML` across the entire codebase.
   - All AI-directed actions are channeled through strict Zod schemas and executed via the sandboxed client controller (`SceneController`).
3. **Resilient Hybrid AI Engine**:
   - Works seamlessly online (Google Gemini API via serverless route handlers) and offline (deterministic rule-based natural language parser).
4. **Adaptive Device Performance**:
   - Dynamic 500ms hysteresis frame rate monitoring automatically steps down graphical quality from Ultra to High, Medium, or Low if the GPU encounters thermal or performance bottlenecks.
5. **Universal Accessibility**:
   - Provides screen reader live updates, full keyboard navigation, `prefers-reduced-motion` detection, and an alternate 2D SVG/Canvas mode (`/lite`).

---

## 3. World Layout & Spatial Coordinates

The NEXUS universe spans a 4-quadrant continuous coordinate space linked via Catmull-Rom energy conduits:

| Zone | Coordinates `[X, Y, Z]` | Description | Primary Shaders / Features |
| :--- | :--- | :--- | :--- |
| **The AI Core** | `[0, 5, 0]` | Central sentient nexus and computational powerhouse | Simplex noise vertex displacement, Fresnel rim glow, 3-axis orbital rings, 1,500 orbiting particles |
| **Code City** | `[0, 0, -120]` | Algorithmic monolithic skyline representing system compute | Mulberry32 PRNG skyscraper clustering, canvas-drawn window matrices, glowing circuit conduits |
| **Data Ocean** | `[150, -5, 0]` | Harmonic mathematical ocean of dynamic vectors | 40,000 instanced particles, real-time topological morphing (Wave, Sphere, Lattice, Chaos) |
| **AI Laboratory** | `[-150, 0, 0]` | Cognitive experimentation and neural matrix grounds | Autonomous Agent state matrix, 3D Memory Lattice graph, 6 floating modular developer tools |

---

## 4. Key Subsystems

- **Procedural Engine** (`/procedural`): Houses seeded PRNG (`Mulberry32`), canvas texture generators, and parametric architectural and particle builders.
- **Engine State & Choreography** (`/engine`): Zustand centralized store, GSAP camera choreographer, adaptive quality monitor, and Web Audio API procedural sound engine.
- **AI Command Dispatch** (`/ai`): Provider abstraction layer (`GeminiProvider`, `FallbackProvider`, `getAIProvider`), Zod validation schemas, and sandboxed scene controller.
- **Custom Shaders** (`/shaders`): GLSL vertex and fragment shader materials for the AI Core, Data Ocean particles, and Relativistic Warp Portals.

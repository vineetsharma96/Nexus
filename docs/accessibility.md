# NEXUS Accessibility & Inclusive Design

Spatial 3D computing must remain accessible to all users, regardless of motor capabilities, visual acuity, or hardware constraints.

---

## 1. Dynamic ARIA Live Region (`ScreenReaderLive.tsx`)

A polite atomic live region (`aria-live="polite"`, `aria-atomic="true"`) announces:
- Zone leaps (e.g., *"Entered Code City — Algorithmic monoliths representing foundational compute"*).
- Architectural node inspections (e.g., *"Inspecting Frontend Gateway Node: Type FRONTEND, Height 38.4m"*).
- Guided tour narration segments.
- AI command completions and status reports.

---

## 2. Global Keyboard Navigation Matrix

Users can navigate the entire 3D world without touching a mouse or trackpad:

| Key | Action |
| :--- | :--- |
| `1` | Jump to **The AI Core** |
| `2` | Jump to **Code City** |
| `3` | Jump to **Data Ocean** |
| `4` | Jump to **AI Laboratory** |
| `Space` | Inspect primary point of interest in the current zone |
| `/` or `T` | Open / Close the AI Terminal |
| `M` | Toggle procedural Web Audio API sound synthesis |
| `?` | Open Keyboard Shortcuts modal |
| `Esc` | Close all open modals, terminal, or POI inspection cards |

---

## 3. Reduced Motion Support

NEXUS continuously monitors the `(prefers-reduced-motion: reduce)` media query:
- Immediately disables high-speed camera flythroughs and warp flashes.
- Replaces sudden camera rotations with smooth, gentle cross-fades.
- Reduces particle drift velocity and dampens ambient oscillations.

---

## 4. 2D Accessible Mode: NEXUS Lite (`/lite`)

For users on devices without WebGL support or who prefer a lightweight 2D interface, `/lite` provides:
- Clean SVG and HTML5 semantic representations of all 4 zones.
- Full architectural specifications, telemetry data, and node inspection details.
- Zero WebGL context creation, zero canvas overhead, and instant page loads.

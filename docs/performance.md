# NEXUS Performance Architecture & Adaptive Quality Engine

NEXUS is engineered to maintain a fluid 60 frames per second across diverse hardware, from high-end discrete GPUs to integrated mobile chipsets.

---

## 1. Rolling FPS Hysteresis Engine (`AdaptiveQualityMonitor.tsx`)

Rather than abruptly toggling quality on momentary spikes or tab unfocus events, NEXUS measures a continuous rolling frame time average over 500ms sliding windows:

```
                  ┌─────────────────────────────────────────┐
                  │          Rolling 500ms Monitor          │
                  └────────────────────┬────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
        FPS < 28 for 4 ticks                         FPS ≥ 56 for 24 ticks
             (2.0 seconds)                              (12.0 seconds)
                │                                             │
                ▼                                             ▼
    [ STEP DOWN QUALITY TIER ]                    [ RECOVER QUALITY TIER ]
   (e.g., Ultra ➔ High ➔ Med)                    (e.g., Med ➔ High ➔ Ultra)
                │                                             │
                └──────────────────────┬──────────────────────┘
                                       │
                                       ▼
                       Enforce 8-Second Oscillation Lock
                          (Prevents Rapid Flickering)
```

---

## 2. Quality Tier Specifications

| Parameter | Ultra | High | Medium | Low |
| :--- | :--- | :--- | :--- | :--- |
| **Ocean Particles** | 40,000 | 25,000 | 12,000 | 4,500 |
| **Core Particles** | 1,500 | 1,000 | 600 | 250 |
| **Building Geometry Detail** | High (All 48 Monoliths) | High (All 48 Monoliths) | Medium (Simplified Rooftops) | Basic (Monolith Bodies Only) |
| **Volumetric Lighting** | Multi-point + Rim | Dual-point + Key | Single key light | Minimal ambient light |
| **Pixel Ratio Cap** | 2.0 | 1.5 | 1.0 | 1.0 |
| **Antialiasing** | FXAA + Shader AA | Shader AA | None | None |

---

## 3. GPU VRAM Disposal Manager (`DisposalManager.ts`)

WebGL applications frequently leak video memory when switching complex scenes. NEXUS implements a recursive resource disposal manager:

```typescript
export class DisposalManager {
  static disposeObject(obj: THREE.Object3D) {
    obj.traverse((child: any) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => this.disposeMaterial(m));
        } else {
          this.disposeMaterial(child.material);
        }
      }
    });
  }

  private static disposeMaterial(mat: any) {
    Object.keys(mat).forEach((prop) => {
      if (mat[prop] && typeof mat[prop].dispose === "function") {
        mat[prop].dispose();
      }
    });
    mat.dispose();
  }
}
```

---

## 4. Mobile & Low-Power Auto-Detection

On initial boot, the engine assesses mobile screen dimensions (< 768px) and touch pointer concurrency:
- Automatically initializes mobile devices on `medium` or `low` tier.
- Employs `100dvh` viewport sizing to eliminate address-bar resize reflows.
- Throttles physics computations when document visibility state shifts to `hidden`.

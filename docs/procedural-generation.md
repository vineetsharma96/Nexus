# NEXUS Procedural Generation Engine

The core philosophy of NEXUS is **ZERO EXTERNAL 3D MODELS**. No `.blend`, `.obj`, `.fbx`, or `.gltf` asset packs are loaded over the network. 100% of geometries, textures, materials, and particle fields are synthesized programmatically in code.

---

## 1. Deterministic PRNG (`Mulberry32`)

To ensure that the 3D world is generated reproducibly across different clients, browsers, and screen resolutions, NEXUS uses a deterministic 32-bit Mulberry PRNG (`procedural/prng/SeededRandom.ts`):

```typescript
export class SeededRandom {
  private state: number;

  constructor(seed: number = 1337) {
    this.state = seed;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}
```

This guarantees consistent building heights, street alignments, window patterns, and orbital ring dimensions without transmitting megabytes of mesh vertex buffers.

---

## 2. Procedural Canvas Texture Generation

Instead of loading PNG/JPEG texture files, textures are rendered to in-memory HTML5 `<canvas>` elements at boot time and wrapped into Three.js `CanvasTexture` instances (`procedural/materials/TextureGenerators.ts`):

### Skyscraper Window Grid (512x1024)
- Iterates over an $8 \times 24$ window tile matrix.
- Seeds individual window illumination probabilities with subtle cyber-cyan and amber emissive variations.
- Includes vertical mullions, horizontal spandrels, and edge borders.

### PCB Circuit & Cyber Grid (512x512)
- Renders glowing circuit traces with $45^\circ$ diagonal bus routing.
- Generates micro-vias, solder contact pads, and surface-mount rectangular capacitors with cyan and violet accents.

```typescript
const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 1024;
const ctx = canvas.getContext("2d");
// Render geometric circuit lines and illuminated windows...
const texture = new THREE.CanvasTexture(canvas);
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
```

---

## 3. Algorithmic Monolith & Code City Generator

Code City (`procedural/city/CityLayout.tsx` & `BuildingGenerator.tsx`) creates an organized procedural metropolis:
- **Grid Layout**: 48 skyscrapers arranged across orthogonal avenues (`X: -60..60`, `Z: -180..-60`).
- **Hero Architectural Spires**: Center spires reaching 45m with glowing vector crowns and helipads.
- **Architectural Archetypes**:
  - `frontend`: Slender high-rise towers with high-density glowing horizontal window bands.
  - `backend`: Heavy monolithic blocks with reinforced corner brackets and deep ventilation cuts.
  - `database`: Cylindrical vector vaults with rotating magnetic rings.
  - `ai`: Multi-tiered neural spires with floating antenna masts.
  - `cloud`: Wide data-center slabs with pulsing server status indicators.
  - `security`: Hexagonal fortified towers with defensive perimeter laser lines.

---

## 4. Mathematical Particle Ocean Morphing

The Data Ocean (`procedural/ocean/ParticleField.tsx`) manages up to 40,000 instanced particles driven by GLSL shaders and real-time algebraic formulations:

1. **Wave Topology**:
   $$Y = \sin(X \cdot 0.08 + t \cdot 1.5) \cdot \cos(Z \cdot 0.08 + t) \cdot 3.5 + \sin(X \cdot 0.03 - t) \cdot 1.5$$
2. **Sphere Topology**:
   Fibonacci spiral distribution mapped onto a spherical shell:
   $$\phi = \arccos\left(1 - \frac{2i}{N}\right), \quad \theta = \pi (1 + \sqrt{5}) i$$
3. **Lattice Topology**:
   Discrete 3D quantum lattice:
   $$X = (i \bmod 32 - 16) \cdot 3.2, \quad Y = (\lfloor i / 1024 \rfloor - 4) \cdot 3.2, \quad Z = (\lfloor (i \bmod 1024) / 32 \rfloor - 16) \cdot 3.2$$
4. **Chaos Topology**:
   Harmonic non-linear Lorenz-inspired attractor:
   $$X = X + \sin(Y \cdot 0.2 + t) \cdot 2.0, \quad Z = Z + \cos(X \cdot 0.2 - t) \cdot 2.0$$

---

## 5. AI Laboratory Cognitive Matrix

The AI Laboratory (`procedural/lab/LaboratoryGenerator.tsx`) programmatically visualizes autonomous machine intelligence:
- **Agent Lifecycle Matrix** (`AgentObject.tsx`): 3 autonomous agents with dynamic status rings (Perception, Deliberation, Action).
- **3D Memory Lattice** (`MemoryLattice.tsx`): Interconnected 3D knowledge graph with glowing node vertices and connecting line segments.
- **Modular Tools Cluster** (`ToolsCluster.tsx`): 6 orbiting modular tools representing web browsing, Python interpreter, vector DB, terminal, vision parser, and code sandbox.

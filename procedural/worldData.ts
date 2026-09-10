import { ZoneMetadata } from "@/types/world";

export const ZONES_METADATA: Record<string, ZoneMetadata> = {
  core: {
    id: "core",
    name: "ZONE 01 — THE CORE",
    tagline: "The Central Artificial Cognition Nucleus",
    coordinates: [0, 5, 0],
    description:
      "A floating, self-sustaining procedural energy sphere enveloped by multi-axis orbital rings and glowing particulate manifolds. It symbolizes the genesis of synthetic intelligence.",
    color: "#00f0ff",
    accent: "rgba(0, 240, 255, 0.4)",
    pois: [
      {
        id: "ai_core",
        name: "Synthetic Nucleus",
        category: "core",
        coordinates: [0, 5, 0],
        description:
          "The heart of NEXUS. Displaced by procedural 3D simplex noise with high-frequency harmonic energy rings.",
        specs: {
          Geometry: "Dual Nested Icosahedron & Torus Array",
          Shaders: "Fresnel Dispersion & Simplex Displacement",
          Particulates: "1,500 Orbiting Nodes",
          Status: "SUPER-CRITICAL COHERENCE",
        },
      },
    ],
  },
  code_city: {
    id: "code_city",
    name: "ZONE 02 — CODE CITY",
    tagline: "Procedural Architectural Megastructure",
    coordinates: [-70, 0, 40],
    description:
      "A sprawling algorithmic metropolis generated entirely through mathematical instancing. Monolithic towers represent fundamental computational pillars: Frontend, Backend, Database, Cloud, and Security.",
    color: "#10b981",
    accent: "rgba(16, 185, 129, 0.4)",
    pois: [
      {
        id: "frontend",
        name: "Interface Spire",
        category: "architecture",
        coordinates: [-80, 18, 25],
        description:
          "High-altitude spire orchestrating rendering pipelines, DOM trees, and zero-latency user telemetry.",
        specs: {
          Framework: "Next.js & React Three Fiber",
          Aesthetics: "Glassmorphism & Procedural Panels",
          Latency: "< 8ms WebGL Frame Time",
        },
      },
      {
        id: "backend",
        name: "Compute Monolith",
        category: "architecture",
        coordinates: [-65, 24, 45],
        description:
          "Massive procedural prism executing deterministic AI schema validation and serverless edge functions.",
        specs: {
          Execution: "Serverless Route Handlers",
          Throughput: "Structured Stream Parsing",
          Security: "Air-gapped Key Isolation",
        },
      },
      {
        id: "database",
        name: "Vector Vault",
        category: "architecture",
        coordinates: [-55, 12, 55],
        description:
          "Multi-tiered crystalline archive storing high-dimensional semantic embeddings and associative memory vectors.",
        specs: {
          Topology: "Cosine Similarity Graph",
          Index: "Hierarchical Navigable Small World (HNSW)",
          Persistence: "Procedural Seeded In-Memory",
        },
      },
    ],
  },
  data_ocean: {
    id: "data_ocean",
    name: "ZONE 03 — DATA OCEAN",
    tagline: "Continuous Mathematical Particle Field",
    coordinates: [70, -10, 40],
    description:
      "A vast sea of 40,000 mathematical points morphing continuously through wave equations, Lorenz attractors, crystalline lattices, and spherical knowledge manifolds.",
    color: "#8b5cf6",
    accent: "rgba(139, 92, 246, 0.4)",
    pois: [
      {
        id: "data_field",
        name: "Harmonic Wave Field",
        category: "data",
        coordinates: [70, -10, 40],
        description:
          "Point buffer driven by multi-frequency sinusoidal interference and reactive pointer dispersion forces.",
        specs: {
          Particles: "40,000 GPU Points",
          Transformation: "Real-time Buffer Interpolation",
          Dynamics: "Pointer Raycast Repulsion Wave",
        },
      },
    ],
  },
  ai_lab: {
    id: "ai_lab",
    name: "ZONE 04 — AI LAB",
    tagline: "Autonomous Agent Laboratory & Lattice",
    coordinates: [0, -5, 130],
    description:
      "The experimental research chamber showcasing autonomous AI agent architectures, associative memory lattices, and dynamic modular tool execution modules.",
    color: "#f59e0b",
    accent: "rgba(245, 158, 11, 0.4)",
    pois: [
      {
        id: "agent",
        name: "Autonomous Agent Matrix",
        category: "agent",
        coordinates: [-10, -3, 125],
        description:
          "Visualizes the cyclic cognitive loop: Perceive -> Reason -> Plan -> Act -> Observe.",
        specs: {
          Cycle: "Perceive -> Reason -> Plan -> Act -> Observe",
          State: "Autonomous Evaluation",
          Visualizer: "Concentric Orbital State Rings",
        },
      },
      {
        id: "memory",
        name: "Memory Lattice",
        category: "memory",
        coordinates: [10, -2, 135],
        description:
          "3D interconnected graph structure illustrating episodic context retention and semantic retrieval.",
        specs: {
          Structure: "Procedural Dynamic Node Lattice",
          Synapses: "Glowing LineSegments & Pulses",
          Decay: "Exponential Attention Weighting",
        },
      },
      {
        id: "tools",
        name: "Modular Tool Cluster",
        category: "tool",
        coordinates: [0, 2, 140],
        description:
          "Hexagonal floating modules activating when tool actions are invoked (Search, Math, Code, Database, API).",
        specs: {
          Modules: "Search | Calculate | Code | DB | API",
          Activation: "Event-driven Glow & Rotation",
        },
      },
    ],
  },
};

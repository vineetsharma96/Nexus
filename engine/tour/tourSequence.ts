import { ZoneId, OceanState } from "@/types/world";

export interface TourStepDefinition {
  id: string;
  stepIndex: number;
  zone: ZoneId;
  targetPoiId?: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  title: string;
  subtitle: string;
  narration: string;
  oceanState?: OceanState;
  durationSeconds: number;
}

export const TOUR_STEPS: TourStepDefinition[] = [
  {
    id: "step_core",
    stepIndex: 0,
    zone: "core",
    targetPoiId: "ai_core",
    cameraPosition: [0, 6, 16],
    cameraTarget: [0, 5, 0],
    title: "THE AI CORE",
    subtitle: "Central Synthetic Cognition",
    narration:
      "Welcome to NEXUS. This is the AI Core. It represents the central intelligence of the environment, generated entirely from mathematical code without pre-modeled geometry.",
    durationSeconds: 8,
  },
  {
    id: "step_city",
    stepIndex: 1,
    zone: "code_city",
    targetPoiId: "backend",
    cameraPosition: [-65, 22, 65],
    cameraTarget: [-65, 12, 45],
    title: "CODE METROPOLIS",
    subtitle: "Algorithmic Architecture",
    narration:
      "Entering Code City. Algorithmic towers represent the computational pillars of intelligence—from frontend rendering trees to serverless backends and vector vaults.",
    durationSeconds: 9,
  },
  {
    id: "step_ocean",
    stepIndex: 2,
    zone: "data_ocean",
    targetPoiId: "data_field",
    cameraPosition: [70, 8, 68],
    cameraTarget: [70, -10, 40],
    oceanState: "sphere",
    title: "DATA OCEAN",
    subtitle: "Continuous Particle Manifold",
    narration:
      "This is the Data Ocean. Tens of thousands of points oscillate according to continuous mathematical waveforms, translating raw entropy into structured knowledge.",
    durationSeconds: 9,
  },
  {
    id: "step_agent",
    stepIndex: 3,
    zone: "ai_lab",
    targetPoiId: "agent",
    cameraPosition: [-10, 3, 136],
    cameraTarget: [-10, 0, 125],
    title: "AUTONOMOUS AGENT",
    subtitle: "The Cognitive Lifecycle",
    narration:
      "Inside the AI Laboratory. Here is the autonomous agent matrix, executing continuous cognitive loops: Perceive, Reason, Plan, Act, and Observe.",
    durationSeconds: 9,
  },
  {
    id: "step_memory",
    stepIndex: 4,
    zone: "ai_lab",
    targetPoiId: "memory",
    cameraPosition: [10, 3, 146],
    cameraTarget: [10, 0, 135],
    title: "MEMORY LATTICE",
    subtitle: "Associative Synaptic Retention",
    narration:
      "Before you is the Memory Lattice. Connected nodes retain conversational context, semantic embeddings, and retrieved information over time.",
    durationSeconds: 9,
  },
  {
    id: "step_tools",
    stepIndex: 5,
    zone: "ai_lab",
    targetPoiId: "tools",
    cameraPosition: [0, 4, 152],
    cameraTarget: [0, 1, 140],
    title: "MODULAR TOOLS CLUSTER",
    subtitle: "External Tool Invocation",
    narration:
      "When an agent determines external capability is required, specialized tools activate—executing searches, computations, and API dispatches.",
    durationSeconds: 9,
  },
  {
    id: "step_conclusion",
    stepIndex: 6,
    zone: "core",
    targetPoiId: "ai_core",
    cameraPosition: [0, 7, 20],
    cameraTarget: [0, 5, 0],
    title: "THE CONTINUOUS FRONTIER",
    subtitle: "Autonomous Digital Space",
    narration:
      "Our expedition concludes. You now command NEXUS. Explore manually, jump between zones, or issue natural language directives to the AI.",
    durationSeconds: 8,
  },
];

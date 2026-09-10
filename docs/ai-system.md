# NEXUS AI Command & Cognitive System

NEXUS bridges natural language human intelligence with digital 3D space. Users can issue conversational directives to command the environment, alter physics, travel to zones, inspect infrastructure, and receive spatial architectural explanations.

---

## 1. Provider Abstraction Architecture

The AI subsystem adheres to a strict interface contract (`ai/provider/AIProvider.interface.ts`):

```typescript
export interface AIProvider {
  sendCommand(prompt: string, currentContext: SceneContext): Promise<SceneCommandResponse>;
  explainNode(nodeId: string, nodeName: string, context?: string): Promise<ExplainResponse>;
}
```

This guarantees that the client UI, 3D scene controller, and API route handlers remain 100% decoupled from the specific AI vendor or network availability.

---

## 2. Dual Provider Strategy

### 1. Google Gemini Provider (`GeminiProvider.ts`)
- Target model: `gemini-1.5-flash` or `gemini-2.0-flash`.
- Uses strict JSON output mode (`responseMimeType: "application/json"`) to prevent markdown hallucination.
- Injects full scene context: active zone, camera position, current ocean topology, lighting intensity, and performance tier.
- Formulates responses conforming to the strict `SceneCommandSchema`.

### 2. Offline Heuristic Fallback Provider (`FallbackProvider.ts`)
- Zero network dependencies, zero API keys required.
- Natural language keyword parsing and intent extraction.
- Maps colloquial phrases:
  - *"Take me to the lab"* $\to$ `NAVIGATE_TO` `ai_lab`
  - *"Turn the ocean into a sphere"* $\to$ `ALTER_SIMULATION` `{ oceanState: "sphere" }`
  - *"Make it fast"* $\to$ `SET_PHYSICS` `{ speed: 2.5 }`
  - *"Change lighting to amber"* $\to$ `SET_ATMOSPHERE` `{ colorScheme: "amber" }`
  - *"Inspect the core"* $\to$ `INSPECT_POI` `ai_core`

### 3. Provider Factory (`getAIProvider.ts`)
Automatically evaluates `process.env.GEMINI_API_KEY`:
```typescript
export function getAIProvider(): AIProvider {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
    return new GeminiProvider(process.env.GEMINI_API_KEY);
  }
  return new FallbackProvider();
}
```

---

## 3. Strict Schema Validation (`SceneCommandSchema`)

All commands received from AI providers or network requests are parsed and validated via Zod (`types/world.ts`):

```typescript
export const SceneCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("NAVIGATE_TO"),
    target: z.enum(["core", "code_city", "data_ocean", "ai_lab"]),
    poiId: z.string().optional(),
    message: z.string(),
  }),
  z.object({
    action: z.literal("ALTER_SIMULATION"),
    oceanState: z.enum(["wave", "sphere", "lattice", "chaos"]).optional(),
    speed: z.number().min(0.1).max(5.0).optional(),
    message: z.string(),
  }),
  z.object({
    action: z.literal("SET_ATMOSPHERE"),
    colorScheme: z.enum(["default", "cyber", "amber", "monochrome"]).optional(),
    lightingIntensity: z.number().min(0.2).max(3.0).optional(),
    message: z.string(),
  }),
  z.object({
    action: z.literal("INSPECT_POI"),
    poiId: z.string(),
    message: z.string(),
  }),
  z.object({
    action: z.literal("EXPLAIN_ARCHITECTURE"),
    topic: z.string(),
    message: z.string(),
  }),
]);
```

---

## 4. Sandboxed Client Controller (`SceneController.ts`)

Commands are dispatched to `SceneController.execute(command)`. The controller strictly executes predefined Zustand actions:
- Never executes dynamic strings (`no eval()`, `no new Function()`).
- Never sets HTML directly (`no innerHTML`).
- Dispatches sound synthesizer effects (`ProceduralAudio.playAIResponse()`, `playPortalWarp()`).
- Directs the GSAP camera choreographer (`CameraChoreographer.flyToZone()`).

---

## 5. Security & Rate Limiting

- **Sliding-Window Rate Limiting**: Enforced on `/api/ai/command` (20 req/min) and `/api/ai/explain` (25 req/min). Returns `HTTP 429 Too Many Requests` on abuse.
- **Input Sanitization**: User prompt strings are capped at 150 characters, stripped of non-printable characters, and insulated from prompt injection attacks.

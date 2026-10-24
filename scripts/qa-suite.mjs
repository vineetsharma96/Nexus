import fs from "fs";
import path from "path";

console.log("==================================================");
console.log("🧪 RUNNING NEXUS COMPREHENSIVE QA TEST SUITE");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

// 1. Audit for Zero External 3D Model Assets
console.log("--- 1. External 3D Model Constraint Audit ---");
const forbiddenExtensions = [".blend", ".obj", ".fbx", ".gltf", ".glb", ".dae", ".3ds", ".c4d", ".max"];
function findFilesWithExt(dir, extList) {
  let matched = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git" || entry.name === ".agents" || entry.name === ".claude" || entry.name === "agent") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      matched = matched.concat(findFilesWithExt(fullPath, extList));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (extList.includes(ext)) {
        matched.push(fullPath);
      }
    }
  }
  return matched;
}

const modelFiles = findFilesWithExt(".", forbiddenExtensions);
assert(modelFiles.length === 0, `Zero external 3D model files found in repository (found: ${modelFiles.length})`);

// 2. Audit for Dangerous Execution Primitives & Secret Leaks
console.log("\n--- 2. Security Primitives & Secret Leaks Audit ---");
function scanSourceCode(dir) {
  let dangerousPatterns = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git" || entry.name === "scripts" || entry.name === ".agents" || entry.name === ".claude" || entry.name === "agent") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      dangerousPatterns = dangerousPatterns.concat(scanSourceCode(fullPath));
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      const rawContent = fs.readFileSync(fullPath, "utf8");
      // Strip block comments and single-line comments
      const content = rawContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
      if (/\beval\s*\(/.test(content)) dangerousPatterns.push({ file: fullPath, type: "eval()" });
      if (/new\s+Function\s*\(/.test(content)) dangerousPatterns.push({ file: fullPath, type: "new Function()" });
      if (/dangerouslySetInnerHTML/.test(content)) dangerousPatterns.push({ file: fullPath, type: "dangerouslySetInnerHTML" });
      if (/NEXT_PUBLIC_GEMINI/.test(content)) dangerousPatterns.push({ file: fullPath, type: "NEXT_PUBLIC_GEMINI leak" });
    }
  }
  return dangerousPatterns;
}

const securityViolations = scanSourceCode(".");
assert(securityViolations.length === 0, `Zero dangerous primitives or secret leaks (found: ${securityViolations.length})`);
if (securityViolations.length > 0) {
  console.error("Violations:", securityViolations);
}

// 3. Documentation Audit
console.log("\n--- 3. Documentation Completeness Audit ---");
const expectedDocs = [
  "README.md",
  "docs/architecture.md",
  "docs/procedural-generation.md",
  "docs/ai-system.md",
  "docs/shader-system.md",
  "docs/performance.md",
  "docs/accessibility.md",
  "docs/deployment.md",
];

for (const doc of expectedDocs) {
  assert(fs.existsSync(doc), `Documentation file exists: ${doc}`);
}

// 4. Live Server HTTP Verification
console.log("\n--- 4. Live Server HTTP Verification ---");
async function testHttpEndpoints() {
  try {
    // Test GET /
    const homeRes = await fetch("http://localhost:3000/");
    assert(homeRes.status === 200, `GET / returns HTTP 200 (Got: ${homeRes.status})`);

    // Test GET /lite
    const liteRes = await fetch("http://localhost:3000/lite");
    assert(liteRes.status === 200, `GET /lite returns HTTP 200 (Got: ${liteRes.status})`);

    // Test POST /api/ai/command with valid command
    const cmdRes = await fetch("http://localhost:3000/api/ai/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Go to the lab", context: { activeZone: "core" } }),
    });
    assert(cmdRes.status === 200, `POST /api/ai/command returns HTTP 200 (Got: ${cmdRes.status})`);
    const cmdData = await cmdRes.json();
    assert(cmdData.command && cmdData.command.action, `Command response contains valid action (Action: ${cmdData.command?.action})`);

    // Test POST /api/ai/explain
    const expRes = await fetch("http://localhost:3000/api/ai/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: "ai_core", nodeName: "AI Core" }),
    });
    assert(expRes.status === 200, `POST /api/ai/explain returns HTTP 200 (Got: ${expRes.status})`);
    const expData = await expRes.json();
    assert(expData.explanation && expData.explanation.length > 0, "Explanation response contains non-empty explanation text");

    // Test Rate Limiter and Input Sanitization
    const malformedRes = await fetch("http://localhost:3000/api/ai/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    assert(malformedRes.status === 400, `POST /api/ai/command rejects invalid JSON with HTTP 400 (Got: ${malformedRes.status})`);

  } catch (err) {
    console.error("HTTP verification error:", err.message);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`📊 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

testHttpEndpoints();

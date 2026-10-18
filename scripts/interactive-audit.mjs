import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/abc/AppData/Roaming/npm/node_modules/playwright");

const ARTIFACTS_DIR = "C:/Users/abc/.gemini/antigravity-ide/brain/e1f9d98d-8c38-4c62-8365-adeed8bb6e01";

async function runInteractiveAudit() {
  console.log("==================================================");
  console.log("🚀 STARTING NEXUS PLAYWRIGHT INTERACTIVE UI AUDIT");
  console.log("==================================================");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--enable-webgl", "--ignore-gpu-blocklist"]
  });

  const consoleLogs = [];
  const errors = [];

  // --- PHASE 1: DESKTOP VIEWPORT INTERACTION (1280x800) ---
  console.log("\n--- Phase 1: Desktop Viewport Interaction (1280x800) ---");
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
  });
  const desktopPage = await desktopContext.newPage();

  desktopPage.on("console", (msg) => {
    consoleLogs.push(`[Desktop Console ${msg.type()}]: ${msg.text()}`);
  });
  desktopPage.on("pageerror", (err) => {
    errors.push(`[Desktop Page Error]: ${err.message}`);
    console.error("❌ Desktop Page Error:", err.message);
  });

  await desktopPage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  console.log("✅ [PASS] Desktop loaded http://localhost:3000");

  // Verify BootScreen title
  const titleText = await desktopPage.textContent("h1");
  console.log(`✅ [PASS] BootScreen Title found: "${titleText?.trim()}"`);

  // Wait for Launch Button and click
  const launchBtn = desktopPage.locator("button:has-text('LAUNCH SPATIAL INTERFACE')");
  await launchBtn.waitFor({ state: "visible", timeout: 5000 });
  await launchBtn.click();
  console.log("✅ [PASS] Clicked 'LAUNCH SPATIAL INTERFACE'");

  // Wait for boot screen fade-out and HUD visibility
  await desktopPage.waitForTimeout(600);
  const hudElement = desktopPage.locator("text=SYS.ONLINE");
  await hudElement.waitFor({ state: "visible", timeout: 5000 });
  console.log("✅ [PASS] Main Telemetry HUD is online");

  // Interact with Zone navigation (Click "CODE CITY")
  const codeCityBtn = desktopPage.locator("button:has-text('CODE CITY')").first();
  await codeCityBtn.click();
  await desktopPage.waitForTimeout(500);
  console.log("✅ [PASS] Navigated to Code City");

  // Click "DATA OCEAN"
  const oceanBtn = desktopPage.locator("button:has-text('DATA OCEAN')").first();
  await oceanBtn.click();
  await desktopPage.waitForTimeout(500);
  console.log("✅ [PASS] Navigated to Data Ocean");

  // Open Cognitive Command Terminal
  const terminalBtn = desktopPage.locator("button[title*='Command Terminal'], button:has-text('COMMAND')").first();
  await terminalBtn.click();
  await desktopPage.waitForTimeout(300);

  const terminalInput = desktopPage.locator("input[placeholder*='directive']");
  if (await terminalInput.isVisible()) {
    await terminalInput.fill("status report");
    await terminalInput.press("Enter");
    await desktopPage.waitForTimeout(800);
    console.log("✅ [PASS] Dispatched directive via AI Terminal");

    // Close terminal
    const closeBtn = desktopPage.locator("button:has(svg.lucide-x)").first();
    await closeBtn.click();
    await desktopPage.waitForTimeout(300);
  }

  // Capture Desktop Screenshot
  const desktopScreenshotPath = path.join(ARTIFACTS_DIR, "desktop-nexus.png");
  await desktopPage.screenshot({ path: desktopScreenshotPath });
  console.log(`📸 [SAVED] Desktop Screenshot saved to ${desktopScreenshotPath}`);
  await desktopContext.close();

  // --- PHASE 2: MOBILE VIEWPORT INTERACTION (390x844 - iPhone 14) ---
  console.log("\n--- Phase 2: Mobile Viewport Interaction (390x844 Touch) ---");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  });
  const mobilePage = await mobileContext.newPage();

  mobilePage.on("console", (msg) => {
    consoleLogs.push(`[Mobile Console ${msg.type()}]: ${msg.text()}`);
  });
  mobilePage.on("pageerror", (err) => {
    errors.push(`[Mobile Page Error]: ${err.message}`);
    console.error("❌ Mobile Page Error:", err.message);
  });

  await mobilePage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  console.log("✅ [PASS] Mobile loaded http://localhost:3000");

  // Tap anywhere on the card or button to enter
  const mobileLaunch = mobilePage.locator("button:has-text('LAUNCH SPATIAL INTERFACE')");
  await mobileLaunch.waitFor({ state: "visible", timeout: 5000 });
  await mobileLaunch.tap();
  console.log("✅ [PASS] Tapped 'LAUNCH SPATIAL INTERFACE' on mobile");

  await mobilePage.waitForTimeout(600);
  const mobileHud = mobilePage.locator("text=SYS.ONLINE");
  await mobileHud.waitFor({ state: "visible", timeout: 5000 });
  console.log("✅ [PASS] Mobile Telemetry HUD initialized");

  // Test Mobile Nav Controls (Next / Prev zone buttons)
  const nextZoneBtn = mobilePage.locator("button[aria-label='Next Zone']");
  if (await nextZoneBtn.isVisible()) {
    await nextZoneBtn.tap();
    await mobilePage.waitForTimeout(400);
    console.log("✅ [PASS] Tapped Mobile 'Next Zone' action button");
  }

  // Capture Mobile 3D Screenshot
  const mobileScreenshotPath = path.join(ARTIFACTS_DIR, "mobile-nexus.png");
  await mobilePage.screenshot({ path: mobileScreenshotPath });
  console.log(`📸 [SAVED] Mobile 3D Screenshot saved to ${mobileScreenshotPath}`);

  // Navigate to 2D Lite Mode on Mobile
  console.log("\n--- Phase 3: Mobile 2D Lite Mode Interaction ---");
  await mobilePage.goto("http://localhost:3000/lite", { waitUntil: "networkidle" });
  console.log("✅ [PASS] Loaded /lite (Accessible 2D Mode)");

  // Tap Zone 02 CODE CITY
  const liteZoneBtn2 = mobilePage.locator("button:has-text('CODE CITY')").first();
  await liteZoneBtn2.tap();
  await mobilePage.waitForTimeout(300);
  console.log("✅ [PASS] Tapped Zone 02 CODE CITY in 2D Mode");

  // Tap Zone 04 AI LAB
  const liteZoneBtn4 = mobilePage.locator("button:has-text('AI LAB')").first();
  await liteZoneBtn4.tap();
  await mobilePage.waitForTimeout(300);
  console.log("✅ [PASS] Tapped Zone 04 AI LAB in 2D Mode");

  // Capture Mobile 2D Screenshot
  const mobileLiteScreenshotPath = path.join(ARTIFACTS_DIR, "mobile-lite.png");
  await mobilePage.screenshot({ path: mobileLiteScreenshotPath });
  console.log(`📸 [SAVED] Mobile 2D Screenshot saved to ${mobileLiteScreenshotPath}`);

  await mobileContext.close();
  await browser.close();

  console.log("\n==================================================");
  console.log(`📊 AUDIT SUMMARY: ${errors.length === 0 ? "100% CLEAN (0 UNCAUGHT ERRORS)" : `${errors.length} ERRORS DETECTED`}`);
  console.log("==================================================");

  if (errors.length > 0) {
    process.exit(1);
  }
}

runInteractiveAudit().catch((err) => {
  console.error("FATAL ERROR IN INTERACTIVE AUDIT:", err);
  process.exit(1);
});

import * as THREE from "three";

/**
 * Procedural canvas texture generators (0 downloaded texture files)
 */
export class ProceduralTextures {
  private static windowTextureCache: THREE.CanvasTexture | null = null;
  private static circuitTextureCache: THREE.CanvasTexture | null = null;
  private static gridTextureCache: THREE.CanvasTexture | null = null;

  /**
   * Generates a procedural skyscraper window grid with random lit/unlit offices
   */
  static getBuildingWindowsTexture(): THREE.CanvasTexture {
    if (this.windowTextureCache) return this.windowTextureCache;
    if (typeof document === "undefined") {
      return new THREE.Texture() as unknown as THREE.CanvasTexture;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Dark building facade base
      ctx.fillStyle = "#0a0f1d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cols = 16;
      const rows = 48;
      const padX = 8;
      const padY = 8;
      const winW = (canvas.width - (cols + 1) * padX) / cols;
      const winH = (canvas.height - (rows + 1) * padY) / rows;

      const windowColors = [
        "#00f0ff", // electric cyan
        "#38bdf8", // sky blue
        "#10b981", // emerald
        "#f59e0b", // warm amber
        "#1e293b", // unlit dark
        "#0f172a", // unlit black
      ];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = padX + c * (winW + padX);
          const y = padY + r * (winH + padY);

          // 40% chance of illuminated window, otherwise dark office
          const isLit = Math.random() < 0.42;
          const color = isLit
            ? windowColors[Math.floor(Math.random() * 4)]
            : windowColors[4 + Math.floor(Math.random() * 2)];

          ctx.fillStyle = color;
          ctx.fillRect(x, y, winW, winH);

          if (isLit) {
            // Bright highlight core without software blur filter
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.fillRect(x + 1, y + 1, Math.max(1, winW - 2), Math.max(1, winH - 2));
          }
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.windowTextureCache = texture;
    return texture;
  }

  /**
   * Generates a procedural circuit board trace texture
   */
  static getCircuitTexture(): THREE.CanvasTexture {
    if (this.circuitTextureCache) return this.circuitTextureCache;
    if (typeof document === "undefined") {
      return new THREE.Texture() as unknown as THREE.CanvasTexture;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
      ctx.lineWidth = 2;

      // Draw algorithmic circuit bus lines
      for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        ctx.moveTo(x, y);

        const steps = 3 + Math.floor(Math.random() * 4);
        for (let s = 0; s < steps; s++) {
          if (Math.random() > 0.5) {
            x += (Math.random() > 0.5 ? 40 : -40);
          } else {
            y += (Math.random() > 0.5 ? 40 : -40);
          }
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Terminal circuit pin dot
        ctx.fillStyle = "#00f0ff";
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.circuitTextureCache = texture;
    return texture;
  }
}

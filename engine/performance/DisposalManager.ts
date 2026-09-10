import * as THREE from "three";

/**
 * Utility to safely and recursively dispose Three.js geometries, materials, and textures
 * Preventing GPU memory leaks on zone unmount or quality tier adjustments
 */
export class DisposalManager {
  static disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => this.disposeMaterial(mat));
        } else {
          this.disposeMaterial(mesh.material);
        }
      }
    });
  }

  private static disposeMaterial(material: THREE.Material) {
    material.dispose();

    // Dispose all assigned textures
    for (const key of Object.keys(material)) {
      const value = (material as any)[key];
      if (value && typeof value.dispose === "function" && value instanceof THREE.Texture) {
        value.dispose();
      }
    }
  }
}

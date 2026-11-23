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
    for (const value of Object.values(material as unknown as Record<string, unknown>)) {
      if (value instanceof THREE.Texture) {
        value.dispose();
      }
    }
  }
}

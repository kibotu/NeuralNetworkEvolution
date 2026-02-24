import { randomRange } from './utils.js';

/**
 * Food class - represents food items that creatures collect
 */
export class Food {
  constructor(bounds) {
    this.position = { x: 0, y: 0 };
    this.bounds = bounds;
    this.mesh = null; // Will be set by the renderer
    this.spawn();
  }
  
  /**
   * Spawn food at a random position within bounds
   */
  spawn() {
    const marginX = (this.bounds.max.x - this.bounds.min.x) * 0.1;
    const marginY = (this.bounds.max.y - this.bounds.min.y) * 0.1;
    this.position.x = randomRange(this.bounds.min.x + marginX, this.bounds.max.x - marginX);
    this.position.y = randomRange(this.bounds.min.y + marginY, this.bounds.max.y - marginY);
    
    // Update mesh position if it exists
    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, 0);
      this.mesh.visible = true;
    }
  }
  
  /**
   * Set the Three.js mesh for this food
   */
  setMesh(mesh) {
    this.mesh = mesh;
    this.mesh.position.set(this.position.x, this.position.y, 0);
  }
  
  /**
   * Get the current position
   */
  getPosition() {
    return this.position;
  }
}

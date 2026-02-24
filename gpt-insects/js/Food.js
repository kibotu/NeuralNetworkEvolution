import { randomRange } from './utils.js';

export class Food {
  constructor(bounds) {
    this.position = { x: 0, y: 0 };
    this.bounds = bounds;
    this.mesh = null;
    this.spawn();
  }

  spawn() {
    const marginX = (this.bounds.max.x - this.bounds.min.x) * 0.1;
    const marginY = (this.bounds.max.y - this.bounds.min.y) * 0.1;
    this.position.x = randomRange(this.bounds.min.x + marginX, this.bounds.max.x - marginX);
    this.position.y = randomRange(this.bounds.min.y + marginY, this.bounds.max.y - marginY);
    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, 0);
      this.mesh.visible = true;
    }
  }

  setMesh(mesh) {
    this.mesh = mesh;
    this.mesh.position.set(this.position.x, this.position.y, 0);
  }
}

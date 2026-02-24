import { NeuralNetwork } from './NeuralNetwork.js';
import { distance, extendedPoint, clamp, randomRange } from './utils.js';

export class Creature {
  constructor(bounds, generation, hiddenLayerCount = 10, config = {}) {
    this.bounds = bounds;
    this.generation = generation;
    this.hiddenLayerCount = hiddenLayerCount;
    this.brain = new NeuralNetwork(6, hiddenLayerCount, 2);

    this.minSpeed = config.minSpeed ?? 0;
    this.maxSpeed = config.maxSpeed ?? 6;
    this.minRotation = config.minRotation ?? 0;
    this.maxRotation = config.maxRotation ?? 180;

    this.position = { x: 0, y: 0 };
    this.angle = randomRange(0, 360);
    this.speed = 0;
    this.previousSpeed = 0;
    this.rotationRate = 0;

    this.life = 100;
    this.fitness = 0;
    this.foodEaten = 0;
    this.lifeCost = 3;
    this._prevDistToFood = null;

    this.mesh = null;
    this.isAlive = true;

    this.leftSensorPos = null;
    this.rightSensorPos = null;

    this.spawn();
  }

  spawn() {
    const marginX = (this.bounds.max.x - this.bounds.min.x) * 0.1;
    const marginY = (this.bounds.max.y - this.bounds.min.y) * 0.1;
    this.position.x = randomRange(this.bounds.min.x + marginX, this.bounds.max.x - marginX);
    this.position.y = randomRange(this.bounds.min.y + marginY, this.bounds.max.y - marginY);
    this.angle = randomRange(0, 360);
    this.life = 100;
    this.fitness = 0;
    this.foodEaten = 0;
    this.isAlive = true;
    this._prevDistToFood = null;

    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, 0);
      this.mesh.rotation.z = this.angle * Math.PI / 180;
      this.mesh.visible = true;
      if (this.mesh.children?.[0]?.material) {
        this.mesh.children[0].material.color.setRGB(1, 0.42, 0.42);
      }
    }
  }

  init() {
    this.spawn();
  }

  isDead() {
    return this.life <= 0 || !this.isAlive;
  }

  live(foodSupply, deltaTime) {
    if (this.isDead()) {
      if (this.mesh) this.mesh.visible = false;
      return;
    }

    this.life -= this.lifeCost * deltaTime;

    if (this.isDead()) {
      this.fitness -= 5;
      if (this.mesh) this.mesh.visible = false;
      return;
    }

    // Survival bonus
    this.fitness += 0.5 * deltaTime;

    const closestFood = this._getClosestFood(foodSupply);
    if (!closestFood) return;

    const distToFood = distance(this.position, closestFood.position);

    // Eat food
    if (distToFood < 0.3) {
      this.life += 50;
      this.fitness += 10;
      this.foodEaten++;
      closestFood.spawn();
    }

    // Proximity reward (strong)
    const halfW = (this.bounds.max.x - this.bounds.min.x) / 2;
    const halfH = (this.bounds.max.y - this.bounds.min.y) / 2;
    const sensingRadius = Math.max(halfW, halfH);
    this.fitness += (1 - clamp(distToFood / sensingRadius, 0, 1)) * 2.0 * deltaTime;

    // Approach bonus: reward getting closer to food
    if (this._prevDistToFood !== null) {
      const approach = this._prevDistToFood - distToFood;
      if (approach > 0) {
        this.fitness += clamp(approach * 3.0, 0, 2) * deltaTime;
      }
    }
    this._prevDistToFood = distToFood;

    // Soft wall penalty: continuous penalty near edges
    const wallMargin = 0.1;
    const lx = (this.position.x - this.bounds.min.x) / (this.bounds.max.x - this.bounds.min.x);
    const ly = (this.position.y - this.bounds.min.y) / (this.bounds.max.y - this.bounds.min.y);
    let wallPenalty = 0;
    if (lx < wallMargin) wallPenalty += (1 - lx / wallMargin);
    if (lx > 1 - wallMargin) wallPenalty += (1 - (1 - lx) / wallMargin);
    if (ly < wallMargin) wallPenalty += (1 - ly / wallMargin);
    if (ly > 1 - wallMargin) wallPenalty += (1 - (1 - ly) / wallMargin);
    this.fitness -= wallPenalty * 3.0 * deltaTime;

    // Sensors
    const leftAngleDeg = this.angle - 25 + 90;
    const rightAngleDeg = this.angle + 25 + 90;
    this.leftSensorPos = extendedPoint(this.position, leftAngleDeg, 0.5);
    this.rightSensorPos = extendedPoint(this.position, rightAngleDeg, 0.5);

    // Relative angle to food
    const forwardRad = (this.angle + 90) * Math.PI / 180;
    const angleToFood = Math.atan2(
      closestFood.position.y - this.position.y,
      closestFood.position.x - this.position.x
    );
    let relativeAngle = angleToFood - forwardRad;
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

    // Wall proximity: signed, -1 near min wall, +1 near max wall, 0 center
    const wallProxX = (this.position.x - (this.bounds.min.x + halfW)) / halfW;
    const wallProxY = (this.position.y - (this.bounds.min.y + halfH)) / halfH;

    const inputs = [
      Math.sin(relativeAngle),
      Math.cos(relativeAngle),
      1 - clamp(distToFood / sensingRadius, 0, 1),
      clamp(wallProxX, -1, 1),
      clamp(wallProxY, -1, 1),
      this.speed / this.maxSpeed
    ];

    const outputs = this.brain.think(inputs);

    // Output 0: rotation (already bounded by tanh to [-1, 1])
    const rotSign = Math.sign(outputs[0]);
    const rotMag = Math.abs(outputs[0]);
    this.rotationRate = rotSign * (this.minRotation + rotMag * (this.maxRotation - this.minRotation));
    this.angle += this.rotationRate * deltaTime;
    this.angle = ((this.angle % 360) + 360) % 360;

    // Output 1: speed (tanh gives [-1,1], map to [minSpeed, maxSpeed])
    this.previousSpeed = this.speed;
    this.speed = this.minSpeed + (outputs[1] + 1) / 2 * (this.maxSpeed - this.minSpeed);

    const radians = (this.angle + 90) * Math.PI / 180;
    this.position.x += Math.cos(radians) * this.speed * deltaTime;
    this.position.y += Math.sin(radians) * this.speed * deltaTime;

    if (this._isTouchingBorder()) {
      this.fitness -= 10;
      this.kill();
      return;
    }

    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, 0);
      this.mesh.rotation.z = this.angle * Math.PI / 180;

      const healthPct = clamp(this.life / 100, 0, 1);
      if (this.mesh.children?.[0]?.material) {
        this.mesh.children[0].material.color.setRGB(
          1 - healthPct * 0.5,
          healthPct * 0.42,
          healthPct * 0.42
        );
      }
    }
  }

  getClosestFood(foodSupply) {
    return this._getClosestFood(foodSupply);
  }

  _getClosestFood(foodSupply) {
    if (!foodSupply?.length) return null;
    let best = null;
    let bestDist = Infinity;
    for (const food of foodSupply) {
      const d = distance(this.position, food.position);
      if (d < bestDist) {
        bestDist = d;
        best = food;
      }
    }
    return best;
  }

  _isTouchingBorder() {
    return this.position.x <= this.bounds.min.x || this.position.x >= this.bounds.max.x ||
           this.position.y <= this.bounds.min.y || this.position.y >= this.bounds.max.y;
  }

  setMesh(mesh) {
    this.mesh = mesh;
    this.mesh.position.set(this.position.x, this.position.y, 0);
    this.mesh.rotation.z = this.angle * Math.PI / 180;
  }

  kill() {
    this.isAlive = false;
    this.life = 0;
    if (this.mesh) this.mesh.visible = false;
  }
}

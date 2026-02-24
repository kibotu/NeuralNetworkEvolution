import { distance, extendedPoint, randomRange, clamp, discretize, undiscretize, sampleFromProbs, softmaxWithTemp } from './utils.js';

// Token layout:
//   0-7:   left sensor bins  (signed angle [-180, 180] deg)
//   8-15:  right sensor bins (signed angle [-180, 180] deg)
//   16-19: wall-X proximity bins (4 bins, 0=far 1=touching, in heading direction)
//   20-23: wall-Y proximity bins (4 bins, 0=far 1=touching, in heading direction)
//   24-30: rotation action bins (7 bins → [-180, 180] deg/s)
//   31-34: speed action bins (4 bins → [0, 6] units/s)
//   35:    BOS token
const SENSOR_BINS = 8;
const WALL_BINS = 4;
const ROTATION_BINS = 7;
const SPEED_BINS = 4;
const LEFT_OFFSET = 0;
const RIGHT_OFFSET = 8;
const WALL_X_OFFSET = 16;
const WALL_Y_OFFSET = 20;
const ROT_OFFSET = 24;
const SPEED_OFFSET = 31;
export const BOS_TOKEN = 35;
export const VOCAB_SIZE = 36;

export class Creature {
  constructor(bounds, gpt, config = {}) {
    this.bounds = bounds;
    this.gpt = gpt;
    this.temperature = config.temperature || 1.2;

    this.position = { x: 0, y: 0 };
    this.angle = randomRange(0, 360);
    this.speed = 0;

    this.life = 100;
    this.lifeCost = 3;
    this.fitness = 0;
    this.foodEaten = 0;
    this.isAlive = true;
    this._prevDistToFood = null;
    this.mesh = null;

    // Context buffer: rolling window of tokens for GPT input
    this.contextTokens = [BOS_TOKEN];
    // Trajectory: recorded for training
    this.trajectory = [];

    // KV cache for fast inference
    this.kvKeys = null;
    this.kvValues = null;
    this._resetKVCache();

    // For attention visualization
    this.lastAttentionWeights = null;

    this.spawn();
  }

  _resetKVCache() {
    this.kvKeys = Array.from({ length: this.gpt.nLayer }, () => []);
    this.kvValues = Array.from({ length: this.gpt.nLayer }, () => []);
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
    this.contextTokens = [BOS_TOKEN];
    this.trajectory = [];
    this._resetKVCache();
    this.lastAttentionWeights = null;

    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, 0);
      this.mesh.rotation.z = this.angle * Math.PI / 180;
      this.mesh.visible = true;
      if (this.mesh.children && this.mesh.children[0]?.material) {
        this.mesh.children[0].material.color.setRGB(1, 0.42, 0.42);
      }
    }
  }

  isDead() {
    return this.life <= 0 || !this.isAlive;
  }

  /**
   * Sense environment and act using the GPT model.
   * Tokenizes observations, feeds through GPT, samples actions.
   */
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

    this.fitness += 0.5 * deltaTime;

    const closestFood = this._getClosestFood(foodSupply);
    if (!closestFood) return;

    const distToFood = distance(this.position, closestFood.position);
    const halfW = (this.bounds.max.x - this.bounds.min.x) / 2;
    const halfH = (this.bounds.max.y - this.bounds.min.y) / 2;
    const sensingRadius = Math.max(halfW, halfH);

    let reward = (1 - clamp(distToFood / sensingRadius, 0, 1)) * 2.0;
    if (distToFood < 0.3) {
      this.life += 50;
      this.fitness += 10;
      this.foodEaten++;
      closestFood.spawn();
      reward = 10;
    }

    this.fitness += reward * deltaTime;

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

    // Compute sensor positions (±25° from forward direction)
    const leftAngleDeg = this.angle - 25 + 90;
    const rightAngleDeg = this.angle + 25 + 90;
    const leftSensor = extendedPoint(this.position, leftAngleDeg, 0.5);
    const rightSensor = extendedPoint(this.position, rightAngleDeg, 0.5);
    this.leftSensorPos = leftSensor;
    this.rightSensorPos = rightSensor;

    // Signed angle from each antenna's pointing direction to food
    const normAngle = (a) => {
      let v = a % (2 * Math.PI);
      if (v > Math.PI) v -= 2 * Math.PI;
      if (v < -Math.PI) v += 2 * Math.PI;
      return v;
    };
    const leftRelAngle = normAngle(
      Math.atan2(closestFood.position.y - leftSensor.y, closestFood.position.x - leftSensor.x)
      - leftAngleDeg * Math.PI / 180
    );
    const rightRelAngle = normAngle(
      Math.atan2(closestFood.position.y - rightSensor.y, closestFood.position.x - rightSensor.x)
      - rightAngleDeg * Math.PI / 180
    );

    // Tokenize signed angles: [-PI, PI] → [-180, 180] degrees → 8 bins
    const leftAngleDegSigned = leftRelAngle * 180 / Math.PI;
    const rightAngleDegSigned = rightRelAngle * 180 / Math.PI;
    const leftToken = LEFT_OFFSET + discretize(leftAngleDegSigned, -180, 180, SENSOR_BINS);
    const rightToken = RIGHT_OFFSET + discretize(rightAngleDegSigned, -180, 180, SENSOR_BINS);

    // Wall-distance tokens: proximity to wall in heading direction
    const forwardRad = (this.angle + 90) * Math.PI / 180;
    const cosF = Math.cos(forwardRad);
    const sinF = Math.sin(forwardRad);
    const dxMin = this.position.x - this.bounds.min.x;
    const dxMax = this.bounds.max.x - this.position.x;
    const dyMin = this.position.y - this.bounds.min.y;
    const dyMax = this.bounds.max.y - this.position.y;
    const distToWallX = cosF > 0 ? dxMax : dxMin;
    const distToWallY = sinF > 0 ? dyMax : dyMin;
    const wallProxX = 1 - Math.min(distToWallX / (halfW * 2), 1);
    const wallProxY = 1 - Math.min(distToWallY / (halfH * 2), 1);
    const wallXToken = WALL_X_OFFSET + discretize(wallProxX, 0, 1, WALL_BINS);
    const wallYToken = WALL_Y_OFFSET + discretize(wallProxY, 0, 1, WALL_BINS);

    // Feed observation tokens into context
    this.contextTokens.push(leftToken, rightToken, wallXToken, wallYToken);

    // If context is getting too long, reset (rolling window)
    if (this.contextTokens.length > this.gpt.blockSize) {
      this.contextTokens = [BOS_TOKEN, leftToken, rightToken, wallXToken, wallYToken];
      this._resetKVCache();
    }

    // Feed observation tokens through GPT (left, right, wallX, wallY)
    const obsTokens = [leftToken, rightToken, wallXToken, wallYToken];
    let result;
    for (let t = 0; t < obsTokens.length; t++) {
      const pos = Math.min(this.contextTokens.length - obsTokens.length + t, this.gpt.blockSize - 1);
      result = this.gpt.forward(obsTokens[t], pos, this.kvKeys, this.kvValues);
    }
    this.lastAttentionWeights = result.attentionWeights;

    // Sample rotation action from logits over rotation token range
    const rotLogits = result.logits.slice(ROT_OFFSET, ROT_OFFSET + ROTATION_BINS);
    const rotProbs = softmaxWithTemp(rotLogits, this.temperature);
    const rotBin = sampleFromProbs(rotProbs);
    const rotToken = ROT_OFFSET + rotBin;

    // Sample speed action
    const speedLogits = result.logits.slice(SPEED_OFFSET, SPEED_OFFSET + SPEED_BINS);
    const speedProbs = softmaxWithTemp(speedLogits, this.temperature);
    const speedBin = sampleFromProbs(speedProbs);
    const speedToken = SPEED_OFFSET + speedBin;

    // Add action tokens to context
    this.contextTokens.push(rotToken, speedToken);

    // Convert actions to continuous values
    // Rotation: 7 bins → [-180, 180] degrees per second
    const rotationPerSecond = undiscretize(rotBin, -180, 180, ROTATION_BINS);
    // Speed: 4 bins → [0, 6] units/s
    const speedAmount = undiscretize(speedBin, 0, 6, SPEED_BINS);

    // Apply rotation (frame-rate independent)
    this.angle += rotationPerSecond * deltaTime;
    this.angle = ((this.angle % 360) + 360) % 360;

    // Apply movement (frame-rate independent)
    this.speed = speedAmount;
    const radians = (this.angle + 90) * Math.PI / 180;
    this.position.x += Math.cos(radians) * this.speed * deltaTime;
    this.position.y += Math.sin(radians) * this.speed * deltaTime;

    if (this._isTouchingBorder()) {
      this.fitness -= 10;
      this.kill();
      return;
    }

    // Record trajectory step for training
    this.trajectory.push({
      tokens: [leftToken, rightToken, wallXToken, wallYToken, rotToken, speedToken],
      reward
    });

    // Update mesh
    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, 0);
      this.mesh.rotation.z = this.angle * Math.PI / 180;
      const healthPercent = Math.min(this.life / 100, 1);
      if (this.mesh.children?.[0]?.material) {
        this.mesh.children[0].material.color.setRGB(
          1 - healthPercent * 0.5,
          healthPercent * 0.42,
          healthPercent * 0.42
        );
      }
    }
  }

  /**
   * Build the full token sequence from this creature's trajectory for GPT training.
   */
  getTrainingSequence() {
    const seq = [BOS_TOKEN];
    for (const step of this.trajectory) {
      seq.push(...step.tokens);
    }
    return seq;
  }

  getTotalReward() {
    return this.trajectory.reduce((sum, s) => sum + s.reward, 0);
  }

  _getClosestFood(foodSupply) {
    if (!foodSupply || foodSupply.length === 0) return null;
    let closest = null;
    let closestDist = Infinity;
    for (const food of foodSupply) {
      const d = distance(this.position, food.position);
      if (d < closestDist) {
        closestDist = d;
        closest = food;
      }
    }
    return closest;
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

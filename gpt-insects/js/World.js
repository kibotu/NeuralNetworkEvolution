import { MicroGPT } from './MicroGPT.js';
import { Creature, VOCAB_SIZE } from './Creature.js';
import { Food } from './Food.js';

/**
 * Phases of the simulation/training cycle.
 */
export const Phase = {
  SIMULATING: 'SIMULATING',
  TRAINING: 'TRAINING',
  IDLE: 'IDLE'
};

export class World {
  constructor(config = {}) {
    this.config = {
      population: config.population || 50,
      foodSupply: config.foodSupply || 80,
      episodeDuration: config.episodeDuration || 20,
      trainingSteps: config.trainingSteps || 40,
      learningRate: config.learningRate || 0.002,
      temperature: config.temperature || 1.2,
      topKPercent: config.topKPercent || 25,
      speed: config.speed || 1,
      bounds: config.bounds || {
        min: { x: -20, y: -20 },
        max: { x: 20, y: 20 }
      }
    };

    // GPT model (shared by all creatures)
    this.gpt = new MicroGPT(VOCAB_SIZE);

    this.creatures = [];
    this.foodItems = [];
    this.phase = Phase.IDLE;
    this.iteration = 0;
    this.episodeTime = 0;
    this.totalTime = 0;
    this.isPaused = false;
    this.needsMeshUpdate = false;

    // Training progress
    this.trainingProgress = 0;
    this.currentTrainingStep = 0;
    this.lastTrainingLoss = 0;

    // History for charts
    this.lossHistory = [];
    this.foodPerIteration = [];
    this.iterationHistory = [];

    // Stats
    this.stats = {
      iteration: 0,
      phase: Phase.IDLE,
      aliveCount: 0,
      deadCount: 0,
      totalFoodEaten: 0,
      avgReward: 0,
      bestReward: 0,
      trainingLoss: 0,
      totalTime: 0,
      paramCount: 0
    };

    // Training state for async chunked training
    this._trainingSequences = [];
    this._trainingSeqIdx = 0;
    this._trainingStepCount = 0;
    this._trainingLossSum = 0;
    this._trainingLossCount = 0;
  }

  init() {
    this.creatures = [];
    for (let i = 0; i < this.config.population; i++) {
      this.creatures.push(new Creature(this.config.bounds, this.gpt, {
        temperature: this.config.temperature
      }));
    }

    this.foodItems = [];
    for (let i = 0; i < this.config.foodSupply; i++) {
      this.foodItems.push(new Food(this.config.bounds));
    }

    this.phase = Phase.SIMULATING;
    this.episodeTime = 0;
    this.stats.paramCount = this.gpt.getParamCount();
    this._updateStats();
  }

  update(deltaTime) {
    if (this.isPaused) return;

    deltaTime *= this.config.speed;
    this.totalTime += deltaTime;

    if (this.phase === Phase.SIMULATING) {
      this._simulationStep(deltaTime);
    } else if (this.phase === Phase.TRAINING) {
      this._trainingStep();
    }

    this._updateStats();
  }

  _simulationStep(deltaTime) {
    this.episodeTime += deltaTime;

    for (const creature of this.creatures) {
      creature.live(this.foodItems, deltaTime);
    }

    const allDead = this.creatures.every(c => c.isDead());
    if (this.episodeTime >= this.config.episodeDuration || allDead) {
      this._endEpisode();
    }
  }

  _endEpisode() {
    // Collect stats for this episode
    let totalFood = 0;
    let totalReward = 0;
    let bestReward = -Infinity;

    const trajectories = [];
    for (const creature of this.creatures) {
      const reward = creature.getTotalReward();
      totalFood += creature.foodEaten;
      totalReward += reward;
      if (reward > bestReward) bestReward = reward;

      const seq = creature.getTrainingSequence();
      if (seq.length > 1) {
        trajectories.push({ sequence: seq, reward, foodEaten: creature.foodEaten });
      }
    }

    this.foodPerIteration.push(totalFood);
    this.stats.totalFoodEaten = totalFood;
    this.stats.avgReward = totalReward / this.creatures.length;
    this.stats.bestReward = bestReward;

    this.iterationHistory.unshift({
      iteration: this.iteration,
      foodEaten: totalFood,
      avgReward: this.stats.avgReward,
      bestReward: bestReward,
      aliveAtEnd: this.creatures.filter(c => !c.isDead()).length,
      totalCreatures: this.creatures.length,
      timestamp: new Date()
    });

    // Select top-K% trajectories for training
    trajectories.sort((a, b) => b.reward - a.reward);
    const topK = Math.max(1, Math.ceil(trajectories.length * this.config.topKPercent / 100));
    this._trainingSequences = trajectories.slice(0, topK).map(t => t.sequence);

    // If no useful trajectories, add some random ones to avoid stagnation
    if (this._trainingSequences.length === 0) {
      this._trainingSequences = trajectories.slice(0, 3).map(t => t.sequence);
    }

    // Begin training phase
    this.phase = Phase.TRAINING;
    this._trainingSeqIdx = 0;
    this._trainingStepCount = 0;
    this._trainingLossSum = 0;
    this._trainingLossCount = 0;
    this.currentTrainingStep = 0;
    this.trainingProgress = 0;
  }

  _trainingStep() {
    // Run a few gradient steps per frame to keep UI responsive
    const stepsPerFrame = 3;
    for (let i = 0; i < stepsPerFrame && this._trainingStepCount < this.config.trainingSteps; i++) {
      const seq = this._trainingSequences[this._trainingSeqIdx % this._trainingSequences.length];
      if (seq && seq.length > 1) {
        const loss = this.gpt.trainOnSequence(seq, this.config.learningRate);
        this._trainingLossSum += loss;
        this._trainingLossCount++;
      }
      this._trainingSeqIdx++;
      this._trainingStepCount++;
    }

    this.currentTrainingStep = this._trainingStepCount;
    this.trainingProgress = this._trainingStepCount / this.config.trainingSteps;

    if (this._trainingLossCount > 0) {
      this.lastTrainingLoss = this._trainingLossSum / this._trainingLossCount;
      this.stats.trainingLoss = this.lastTrainingLoss;
    }

    if (this._trainingStepCount >= this.config.trainingSteps) {
      this._endTraining();
    }
  }

  _endTraining() {
    const avgLoss = this._trainingLossCount > 0 ? this._trainingLossSum / this._trainingLossCount : 0;
    this.lossHistory.push(avgLoss);

    this.iteration++;
    this._startNewEpisode();
  }

  _startNewEpisode() {
    // Reset all creatures for new episode
    for (const creature of this.creatures) {
      creature.spawn();
      creature.temperature = this.config.temperature;
    }

    // Respawn food
    for (const food of this.foodItems) {
      food.spawn();
    }

    this.episodeTime = 0;
    this.phase = Phase.SIMULATING;
    this.needsMeshUpdate = true;
  }

  _updateStats() {
    const dead = this.creatures.filter(c => c.isDead()).length;
    this.stats.iteration = this.iteration;
    this.stats.phase = this.phase;
    this.stats.aliveCount = this.creatures.length - dead;
    this.stats.deadCount = dead;
    this.stats.totalTime = this.totalTime;
  }

  restart() {
    for (const creature of this.creatures) creature.kill();
    this.gpt = new MicroGPT(VOCAB_SIZE);
    this.iteration = 0;
    this.episodeTime = 0;
    this.totalTime = 0;
    this.lossHistory = [];
    this.foodPerIteration = [];
    this.iterationHistory = [];
    this.phase = Phase.IDLE;
    this.init();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
  }

  setSpeed(speed) {
    this.config.speed = Math.max(0.1, Math.min(5, speed));
  }

  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    for (const creature of this.creatures) {
      creature.temperature = this.config.temperature;
    }
  }

  getIterationHistory() {
    return this.iterationHistory;
  }
}

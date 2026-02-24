import { GeneticAlgorithm } from './GeneticAlgorithm.js';
import { Food } from './Food.js';

export class World {
  constructor(config = {}) {
    this.config = {
      initialPopulation: config.initialPopulation || 50,
      initialFoodSupply: config.initialFoodSupply || 80,
      ticksPerGeneration: config.ticksPerGeneration || 20,
      secondsPerTick: config.secondsPerTick || 1,
      hiddenLayerCount: config.hiddenLayerCount || 10,
      crossoverRate: config.crossoverRate || 65,
      mutationRate: config.mutationRate || 12,
      minSpeed: config.minSpeed ?? 0,
      maxSpeed: config.maxSpeed ?? 6,
      minRotation: config.minRotation ?? 0,
      maxRotation: config.maxRotation ?? 180,
      speed: config.speed || 1,
      bounds: config.bounds || {
        min: { x: -20, y: -20 },
        max: { x: 20, y: 20 }
      }
    };

    this.creatures = [];
    this.foodSupply = [];
    this.currentTick = 0;
    this.currentTickTime = 0;
    this.totalTime = 0;
    this.isPaused = false;
    this.needsMeshUpdate = false;

    this.generationHistory = [];
    this.currentGenerationStartTime = 0;
    this.currentGenerationFoodEaten = 0;

    this.geneticAlgorithm = new GeneticAlgorithm(
      this.config.crossoverRate,
      this.config.mutationRate
    );

    this.stats = {
      generation: 0,
      aliveCount: 0,
      deadCount: 0,
      averageFitness: 0,
      highestFitness: 0,
      totalTime: 0
    };
  }

  init() {
    this.creatures = this.geneticAlgorithm.spawnInitialPopulation(
      this.config.initialPopulation,
      this.config.bounds,
      this.config.hiddenLayerCount,
      this._creatureConfig()
    );

    this.foodSupply = [];
    for (let i = 0; i < this.config.initialFoodSupply; i++) {
      this.foodSupply.push(new Food(this.config.bounds));
    }

    this.currentTick = 0;
    this.currentTickTime = 0;
    this.totalTime = 0;
    this.currentGenerationStartTime = 0;
    this.currentGenerationFoodEaten = 0;

    this.updateStats();
  }

  update(deltaTime) {
    if (this.isPaused) return;

    deltaTime *= this.config.speed;
    this.totalTime += deltaTime;

    this.currentTickTime += deltaTime;
    if (this.currentTickTime >= this.config.secondsPerTick) {
      this.currentTickTime -= this.config.secondsPerTick;
      this.currentTick++;
    }

    const foodPositionsBefore = this.foodSupply.map(f => ({ x: f.position.x, y: f.position.y }));

    for (const creature of this.creatures) {
      creature.live(this.foodSupply, deltaTime);
    }

    for (let i = 0; i < this.foodSupply.length; i++) {
      const before = foodPositionsBefore[i];
      const after = this.foodSupply[i].position;
      if (before.x !== after.x || before.y !== after.y) {
        this.currentGenerationFoodEaten++;
      }
    }

    const deadCount = this.getDeadCreatureCount();
    if (this.currentTick >= this.config.ticksPerGeneration || deadCount === this.creatures.length) {
      this.evolve();
    }

    this.updateStats();
  }

  evolve() {
    const generationDuration = this.totalTime - this.currentGenerationStartTime;
    const survivors = this.creatures.filter(c => !c.isDead()).length;

    this.generationHistory.unshift({
      generation: this.geneticAlgorithm.generation,
      duration: generationDuration,
      survivors,
      totalCreatures: this.creatures.length,
      averageFitness: this.geneticAlgorithm.averageFitness,
      bestFitness: this.geneticAlgorithm.highestFitness,
      foodEaten: this.currentGenerationFoodEaten,
      timestamp: new Date()
    });

    this.creatures = this.geneticAlgorithm.evolve(
      this.creatures,
      this.config.bounds,
      this.config.hiddenLayerCount,
      this._creatureConfig()
    );

    this.currentTick = 0;
    this.currentTickTime = 0;
    this.currentGenerationStartTime = this.totalTime;
    this.currentGenerationFoodEaten = 0;
    this.needsMeshUpdate = true;
  }

  getDeadCreatureCount() {
    return this.creatures.filter(c => c.isDead()).length;
  }

  updateStats() {
    this.stats.generation = this.geneticAlgorithm.generation;
    this.stats.deadCount = this.getDeadCreatureCount();
    this.stats.aliveCount = this.creatures.length - this.stats.deadCount;
    this.stats.averageFitness = this.geneticAlgorithm.averageFitness;
    this.stats.highestFitness = this.geneticAlgorithm.highestFitness;
    this.stats.totalTime = this.totalTime;
  }

  restart() {
    for (const creature of this.creatures) creature.kill();
    this.geneticAlgorithm = new GeneticAlgorithm(
      this.config.crossoverRate,
      this.config.mutationRate
    );
    this.generationHistory = [];
    this.init();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
  }

  setSpeed(speed) {
    this.config.speed = Math.max(0.1, Math.min(10, speed));
  }

  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    if (newConfig.crossoverRate !== undefined || newConfig.mutationRate !== undefined) {
      this.geneticAlgorithm.crossoverChance = this.config.crossoverRate;
      this.geneticAlgorithm.mutationChance = this.config.mutationRate;
      this.geneticAlgorithm.elitismChance = 100 - this.config.crossoverRate;
    }
  }

  getBestCreature() {
    return this.geneticAlgorithm.getBestCreature(this.creatures);
  }

  cloneGeneration() {
    const newWorld = new World(this.config);
    newWorld.init();

    const bestCreatures = [...this.creatures]
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, Math.min(10, this.creatures.length));

    for (let i = 0; i < Math.min(bestCreatures.length, newWorld.creatures.length); i++) {
      const weights = bestCreatures[i % bestCreatures.length].brain.getWeights();
      newWorld.creatures[i].brain.setWeights(weights);
    }

    return newWorld;
  }

  _creatureConfig() {
    return {
      minSpeed: this.config.minSpeed,
      maxSpeed: this.config.maxSpeed,
      minRotation: this.config.minRotation,
      maxRotation: this.config.maxRotation
    };
  }

  getGenerationHistory() {
    return this.generationHistory;
  }

  getGenerationProgress() {
    if (this.config.ticksPerGeneration <= 0) return 0;
    return Math.min(1, this.currentTick / this.config.ticksPerGeneration);
  }
}

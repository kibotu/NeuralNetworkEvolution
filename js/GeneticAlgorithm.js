import { Creature } from './Creature.js';
import { randomRange, randomInt } from './utils.js';

export class GeneticAlgorithm {
  constructor(crossoverChance = 65, mutationChance = 12) {
    this.crossoverChance = crossoverChance;
    this.elitismChance = 100 - crossoverChance;
    this.mutationChance = mutationChance;
    this.generation = 0;
    this.averageFitness = 0;
    this.highestFitness = 0;
  }

  spawnInitialPopulation(amount, bounds, hiddenLayerCount = 16, creatureConfig = {}) {
    const population = [];
    for (let i = 0; i < amount; i++) {
      population.push(new Creature(bounds, this.generation, hiddenLayerCount, creatureConfig));
    }
    this.generation++;
    return population;
  }

  evolve(creatures, bounds, hiddenLayerCount = 16, creatureConfig = {}) {
    const nextGeneration = [];

    this.calculateFitness(creatures);
    this.elitism(creatures, nextGeneration);

    // Protect top 10% (min 2) from mutation
    const protectedCount = Math.max(2, Math.ceil(creatures.length * 0.1));
    const eliteSet = new Set(nextGeneration.slice(0, protectedCount));

    this.crossover(creatures, nextGeneration, bounds, hiddenLayerCount, creatureConfig);
    this.mutation(nextGeneration, eliteSet, creatures);
    this.killParents(creatures, nextGeneration);
    this.initNextGeneration(nextGeneration);

    this.generation++;
    return nextGeneration;
  }

  calculateFitness(creatures) {
    this.highestFitness = -Infinity;
    this.averageFitness = 0;
    for (const c of creatures) {
      this.averageFitness += c.fitness;
      if (c.fitness > this.highestFitness) this.highestFitness = c.fitness;
    }
    this.averageFitness /= creatures.length;
  }

  elitism(creatures, nextGeneration) {
    const sorted = [...creatures].sort((a, b) => b.fitness - a.fitness);
    const eliteCount = Math.floor(creatures.length * (this.elitismChance / 100));
    for (let i = 0; i < eliteCount; i++) {
      nextGeneration.push(sorted[i]);
    }
  }

  crossover(creatures, nextGeneration, bounds, hiddenLayerCount, creatureConfig = {}) {
    const crossoverCount = Math.floor(creatures.length * (this.crossoverChance / 100));

    for (let i = 0; i < crossoverCount; i++) {
      const father = this.selection(nextGeneration);
      const mother = this.selection(nextGeneration);
      if (!father || !mother) continue;

      const fatherWeights = father.brain.getWeights();
      const motherWeights = mother.brain.getWeights();
      const childWeights = new Array(fatherWeights.length);

      // Uniform crossover: each weight randomly from either parent
      for (let k = 0; k < childWeights.length; k++) {
        childWeights[k] = Math.random() < 0.5 ? fatherWeights[k] : motherWeights[k];
      }

      const child = new Creature(bounds, this.generation, hiddenLayerCount, creatureConfig);
      child.brain.setWeights(childWeights);
      nextGeneration.push(child);
    }
  }

  selection(population) {
    if (population.length === 0) return null;
    const tournamentSize = Math.min(3, population.length);
    let best = population[randomInt(0, population.length)];
    for (let i = 1; i < tournamentSize; i++) {
      const candidate = population[randomInt(0, population.length)];
      if (candidate.fitness > best.fitness) best = candidate;
    }
    return best;
  }

  mutation(nextGeneration, protectedElites = new Set(), originalCreatures = []) {
    // Rank creatures for adaptive mutation magnitude
    const sorted = [...originalCreatures].sort((a, b) => b.fitness - a.fitness);
    const rankMap = new Map();
    sorted.forEach((c, i) => rankMap.set(c, i / Math.max(1, sorted.length - 1)));

    for (const creature of nextGeneration) {
      if (protectedElites.has(creature)) continue;

      const weights = creature.brain.getWeights();
      let mutated = false;

      // Adaptive magnitude: worse rank = larger perturbation
      const rank = rankMap.get(creature) ?? 0.5;
      const magnitude = 0.1 + rank * 0.4; // 0.1 for best, 0.5 for worst

      for (let w = 0; w < weights.length; w++) {
        if (randomRange(0, 100) < this.mutationChance) {
          weights[w] += randomRange(-magnitude, magnitude);
          mutated = true;
        }
      }
      if (mutated) creature.brain.setWeights(weights);
    }
  }

  killParents(oldGeneration, nextGeneration) {
    const nextSet = new Set(nextGeneration);
    for (const c of oldGeneration) {
      if (!nextSet.has(c)) c.kill();
    }
  }

  initNextGeneration(nextGeneration) {
    for (const c of nextGeneration) {
      c.init();
      c.generation = this.generation;
    }
  }

  getBestCreature(creatures) {
    if (creatures.length === 0) return null;
    let best = creatures[0];
    for (const c of creatures) {
      if (c.fitness > best.fitness) best = c;
    }
    return best;
  }
}

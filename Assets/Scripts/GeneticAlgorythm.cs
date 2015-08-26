using System;
using System.Collections.Generic;
using System.Linq;
using Assets.Scripts.Utils;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Assets.Scripts
{
    [Serializable]
    public class GeneticAlgorythm
    {
        public double AverageFitness;
        public double CrossOverChance;
        public double ElitismChance;
        public int Generation;
        public double HighestFitness;
        public double MutationChance;
        public List<Creature> NextGeneration;

        public GeneticAlgorythm(double crossOverChance, double mutationChance)
        {
            CrossOverChance = crossOverChance;
            ElitismChance = 100 - CrossOverChance;
            MutationChance = mutationChance;
        }

        public List<Creature> SpawnInitialPopulation(int amount, Bounds bounds)
        {
            NextGeneration = new List<Creature>(amount);
            for (var i = 0; i < amount; ++i)
            {
                NextGeneration.Add(Prefabs.CreateCreature().SpawnIn(bounds, Generation));
            }
            Generation++;
            return NextGeneration;
        }

        public List<Creature> Evolve(List<Creature> creatures, Bounds bounds)
        {
            NextGeneration = new List<Creature>();

            CalculateFitness(creatures);
            Elitism(creatures);
            CrossOver(creatures, bounds);
            Mutation();

            KillParents(creatures);
            InitNextGeneration();

            Generation++;

            return NextGeneration;
        }

        private void InitNextGeneration()
        {
            foreach (var creature in NextGeneration)
            {
                creature.Init();
            }
        }

        private void KillParents(IEnumerable<Creature> oldGeneration)
        {
            foreach (var oldGen in oldGeneration)
            {
                var survived = false;
                var gen = oldGen;
                foreach (var nextGen in NextGeneration.Where(nextGen => nextGen.GetInstanceID() == gen.GetInstanceID()))
                {
                    survived = true;
                }

                if (!survived)
                    oldGen.Kill();
            }
        }

        private void Mutation()
        {
            foreach (var creature in NextGeneration)
            {
                if (!(Random.Range(0, 100) < MutationChance)) continue;
                var mutationPoint = Random.Range(0, creature.Brain.DendritesCount());
                var weights = creature.Brain.GetWeights();
                weights[mutationPoint] = Random.Range(0f, 1f);
                creature.Brain.SetWeights(weights);
            }
        }

        private void CrossOver(ICollection<Creature> creatures, Bounds bounds)
        {
            var amountCrossOver = (int) (creatures.Count*CrossOverChance/100);
            for (var i = 0; i < amountCrossOver; ++i)
            {
                var father = Selection();
                var mother = Selection();

                var fatherWeights = father.Brain.GetWeights();
                var motherWeights = mother.Brain.GetWeights();

                var childWeights = new double[fatherWeights.Length];

                var crossOverPoint = Random.Range(0, fatherWeights.Length);

                for (var k = 0; k < childWeights.Length; ++k)
                {
                    childWeights[k] = k < crossOverPoint
                        ? fatherWeights[k]
                        : motherWeights[k];
                }

                var child = Prefabs.CreateCreature().SpawnIn(bounds, Generation);
                child.Brain.SetWeights(childWeights);
                NextGeneration.Add(child);
            }
        }

        private Creature Selection()
        {
            var parentThreshold = Random.Range(0, 100);
            return NextGeneration.FirstOrDefault(creature => creature.ParentChance > parentThreshold);
        }

        private void Elitism(List<Creature> creatures)
        {
            creatures = creatures.OrderByDescending(creature => creature.Fitness).ToList();
            var amountElites = (int) (creatures.Count()*(ElitismChance/100));
            for (var i = 0; i < amountElites; i++)
                NextGeneration.Add(creatures[i]);
        }

        private void CalculateFitness(ICollection<Creature> creatures)
        {
            HighestFitness = 0;
            AverageFitness = 0;
            CalculateAvarageFitness(creatures);

            SetCreaturesReproductionChance(creatures);
        }

        private void SetCreaturesReproductionChance(IEnumerable<Creature> creatures)
        {
            foreach (var creature in creatures)
                creature.ParentChance = Math.Abs(HighestFitness) < Mathf.Epsilon
                    ? 100
                    : creature.Fitness/HighestFitness*100;
        }

        private void CalculateAvarageFitness(ICollection<Creature> creatures)
        {
            foreach (var creature in creatures)
            {
                AverageFitness += creature.Fitness;
                if (creature.Fitness > HighestFitness)
                    HighestFitness = creature.Fitness;
            }

            AverageFitness /= creatures.Count;
        }
    }
}
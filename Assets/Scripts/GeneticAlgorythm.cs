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
        public int Generation;
        public double ElitismChance;
        public double CrossOverChance;
        public double MutationChance;
        public double AverageFitness;
        public double HighestFitness;

        public List<Creature> NextGeneration;

        public GeneticAlgorythm(double crossOverChance, double mutationChance)
        {
            CrossOverChance = crossOverChance;
            ElitismChance = 100 - CrossOverChance;
            MutationChance = mutationChance;
        }

        public void Evolve(List<Creature> creatures, Bounds bounds)
        {
            NextGeneration = new List<Creature>();

            CalculateFitness(creatures);
            Elitism(creatures);
            CrossOver(creatures, bounds);
            Mutation();
            CopyCreatures(creatures);

            Generation++;

            NextGeneration.Clear();
        }

        private void CopyCreatures(List<Creature> creatures)
        {
        }

        private void Mutation()
        {
                
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

                var child = Prefabs.CreateCreature().SpawnIn(bounds);
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
            var nrOfElites = (int)(creatures.Count() * (ElitismChance / 100));
            for (var i = 0; i < nrOfElites; i++)
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

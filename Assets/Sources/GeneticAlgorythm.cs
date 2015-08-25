using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Assets.Sources
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

        private void CrossOver(List<Creature> creatures, Bounds bounds)
        {
            var amountCrossOver = (int) (creatures.Count*CrossOverChance/100);
            for (var i = 0; i < amountCrossOver; ++i)
            {
                var father = Selection();
                var mother = Selection();

                double[] fatherWeights = father.Brain.GetWeights();
                double[] motherWeights = mother.Brain.GetWeights();
            }
        }

        private Creature Selection()
        {
            return null;
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

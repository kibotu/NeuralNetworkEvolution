using System.Collections.Generic;
using System.Linq;
using Assets.Scripts.Utils;
using UnityEngine;

namespace Assets.Scripts
{
    public class World : MonoBehaviour
    {
        public Bounds Bounds = new Bounds(Vector3.zero, new Vector3(20,20,20));
        public int InitialPopulation = 10;
        public int InitialFoodSupply = 10;
        private List<Creature> _creatures;
        private List<Food> _foodSupply;
        public int Ticks;
        public int AmountDeathCreatures;
        public GeneticAlgorythm GeneticAlgorythm;

        void Start ()
        {
            GeneticAlgorythm = new GeneticAlgorythm(60,1);
            SpawnInitialPopulationAndFoodSupply();
        }

        private void SpawnInitialPopulationAndFoodSupply()
        {
            // spawn initial population
            _creatures = GeneticAlgorythm.SpawnInitialPopulation(InitialPopulation, Bounds);

            // spawn initial food supply
            _foodSupply = new List<Food>(InitialFoodSupply);
            for (var i = 0; i < InitialFoodSupply; ++i)
            {
                var food = Prefabs.CreateFood();
                food.SpawnIn(Bounds);
                _foodSupply.Add(food);
            }

            name = "World [" + _creatures.Count + "]";
        }

        public float CurrentTickTime;
        public float SecondsPerTick = 1;
        public float TotalTime;

        void Update ()
        {
            TotalTime = Time.time;
            CurrentTickTime += Time.deltaTime;
            if (CurrentTickTime >= SecondsPerTick)
            {
                CurrentTickTime = SecondsPerTick - CurrentTickTime;
            }
            else
                return;

            ++Ticks;

            foreach (var creature in _creatures)
            {
                creature.Live(_foodSupply);
            }

            AmountDeathCreatures = GetAmountOfDeathCreatures();

            if (Ticks == 10000 || AmountDeathCreatures == _creatures.Count)
            {
                Ticks = 0;
                _creatures = GeneticAlgorythm.Evolve(_creatures, Bounds);
            }
        }

        private int GetAmountOfDeathCreatures()
        {
            return _creatures.Cast<Creature>().Count(creature => creature.IsDeath());
        }
    }
}

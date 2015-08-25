using System.Collections.Generic;
using System.Linq;
using Assets.Scripts.Utils;
using UnityEngine;

namespace Assets.Scripts
{
    public class World : MonoBehaviour
    {
        public Bounds Bounds;
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

        private float _startTime;
        private const float SecondsPerTick = 1;
        public float TotalTime;
        public float MeasuredTotalTime;

        void Update ()
        {
            TotalTime = Time.time;
            _startTime += Time.deltaTime;
            if (_startTime >= SecondsPerTick)
            {
                _startTime = SecondsPerTick - _startTime;
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

using System.Collections.Generic;
using System.Linq;
using Assets.Scripts.Utils;
using UnityEngine;
using UnityEngine.UI;

namespace Assets.Scripts
{
    public class World : MonoBehaviour
    {
        private List<Creature> _creatures;
        private List<Food> _foodSupply;
        public int AmountDeathCreatures;
        public Bounds Bounds = new Bounds(Vector3.zero, new Vector3(20, 20, 20));
        public float CurrentTickTime;
        public GeneticAlgorythm GeneticAlgorythm;
        public int InitialFoodSupply = 10;
        public int InitialPopulation = 10;
        public float SecondsPerTick = 1;
        public int TicksPerGernations = 1000;
        public int CurrentTick;
        public float TotalTime;

        [Range(0,2)] public float Speed = 1;

        public void Start()
        {
            GeneticAlgorythm = new GeneticAlgorythm(60, 1);
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

        public void Update()
        {
            Time.timeScale = Speed;

            TotalTime = Time.time;
            CurrentTickTime += Time.deltaTime;
            if (CurrentTickTime >= SecondsPerTick)
            {
                CurrentTickTime = SecondsPerTick - CurrentTickTime;
            }
            else
                return;

            ++CurrentTick;

            foreach (var creature in _creatures)
            {
                creature.Live(_foodSupply);
            }

            AmountDeathCreatures = GetAmountOfDeathCreatures();

            if (CurrentTick == TicksPerGernations || AmountDeathCreatures == _creatures.Count)
            {
                CurrentTick = 0;
                _creatures = GeneticAlgorythm.Evolve(_creatures, Bounds);
            }
        }

        private int GetAmountOfDeathCreatures()
        {
            return _creatures.Count(creature => creature.IsDeath());
        }
    }
}
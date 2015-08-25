using System.Collections;
using UnityEngine;

namespace Assets.Sources
{
    public class World : MonoBehaviour
    {
        [SerializeField]
        private GameObject CreatePrefab;
        [SerializeField]
        private GameObject FoodPrefab;

        [SerializeField]
        private Bounds Bounds;

        [SerializeField]
        private int initialPopulation;
        [SerializeField]
        private int initialFoodSupply;
        
        [SerializeField]
        private ArrayList Creatures;

        [SerializeField]
        private ArrayList FoodSupply;

        [SerializeField]
        private int Ticks;

        [SerializeField] private int amountDeaths;

        private GeneticAlgorythm geneticAlgorythm;

        void Start ()
        {
            // spawn initial population
            Creatures = new ArrayList(initialPopulation);
            for (var i = 0; i < initialPopulation; ++i)
            {
                var creature = Instantiate(CreatePrefab);
                creature.GetComponent<Creature>().SpawnIn(Bounds);
                Creatures.Add(creature);
            }

            // spawn initial food supply
            FoodSupply = new ArrayList(initialFoodSupply);
            for (var i = 0; i < initialFoodSupply; ++i)
            {
                var food = Instantiate(FoodPrefab);
                food.GetComponent<Food>().SpawnIn(Bounds);
                FoodSupply.Add(food);
            }
        }
	
        void Update ()
        {
            ++Ticks;
        }
    }
}

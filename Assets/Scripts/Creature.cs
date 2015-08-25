using System.Collections.Generic;
using Assets.Scripts.Utils;
using UnityEngine;

namespace Assets.Scripts
{
    public class Creature : MonoBehaviour
    {
        public double Life;
        public int Angle;
        public int Fitness;
        public double LifeCost = 15;
        public int Generation;

        public NeuralNetwork.NeuralNetwork Brain = new NeuralNetwork.NeuralNetwork();

        public Bounds Bounds { get; set; }
        public double ParentChance;

        public bool IsDeath()
        {
            return Life <= 0;
        }

        public Creature Live(List<Food> foodSupply)
        {
            if (IsDeath())
            {
                GetComponent<SpriteRenderer>().enabled = false;
                return this;
            }

            Life -= LifeCost;

            return this;
        }

        public Creature SpawnIn(Bounds bounds, int generation)
        {
            name = "Create [" + generation + "]";
            Generation = generation;
            transform.SetParent(GameObject.Find("Population").transform, true);
            Bounds = bounds;
            Init();
            transform.position = new Vector2(Random.Range(Bounds.min.x, Bounds.max.x), Random.Range(Bounds.min.y, Bounds.max.y));
            // transform.Rotate(Angle);
            return this;
        }

        public void Init()
        {
            GetComponent<SpriteRenderer>().enabled = true;
            Life = 100;
            Fitness = 0;
            Angle = Random.Range(0, 360);
        }

        public void Kill()
        {
            Destroy(gameObject);
        }
    }
}

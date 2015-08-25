using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Assets.Sources
{
    public class Creature : MonoBehaviour
    {
        public double Life = 100;
        public int Angle = 0;
        public int Fitness = 0;
        public double LifeCost = 15;

        public NeuralNetwork.NeuralNetwork Brain = new NeuralNetwork.NeuralNetwork();

        public Bounds Bounds { get; set; }
        public double ParentChance;

        public bool IsDeath()
        {
            return Life <= 0;
        }

        public void Live(List<Food> foodSupply)
        {
            if (IsDeath())
            {
                GetComponent<SpriteRenderer>().enabled = false;
                return;
            }
                
            Life -= LifeCost;
        }

        public void SpawnIn(Bounds bounds)
        {
            Bounds = bounds;
            Angle = Random.Range(0, 360);
            transform.position = new Vector2(Random.Range(Bounds.min.x, Bounds.max.x), Random.Range(Bounds.min.y, Bounds.max.y));
            // transform.Rotate(Angle);
        }
    }
}

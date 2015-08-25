using System.Collections.Generic;
using Assets.Scripts.NeuralNetwork;
using UnityEngine;

namespace Assets.Scripts
{
    public class Creature : MonoBehaviour
    {
        public double Life;
        public float Angle;
        public int Fitness;
        public double LifeCost = 15;
        public int Generation;

        public NeuralNetwork.NeuralNetwork Brain;

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

            var input = new SensoryInput();

            var closestFoodLeft = 1;
            var closestFoodRight = 0;

            if (closestFoodLeft > closestFoodRight)
            {
                input.Left = 1;
                input.Right = -1;
            }
            else
            {
                input.Left = -1;
                input.Right = 1;
            }

            input.Angle = 0;
            input.Speed = 0;

            var output = Brain.Think(input);

            if (output.Left > output.Right)
                Angle += (float)output.Left;
            else
                Angle -= (float)output.Right;

            transform.rotation = Quaternion.Euler(new Vector3(0, 0, Angle));

            transform.position += transform.up * (float)output.Speed;

            return this;
        }

        public Creature SpawnIn(Bounds bounds, int generation)
        {
            name = "Create [" + generation + "]";
            Brain = new NeuralNetwork.NeuralNetwork(0, 4, 250, 3);
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

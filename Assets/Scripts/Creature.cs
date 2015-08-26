using System.Collections.Generic;
using Assets.Scripts.NeuralNetwork;
using Assets.Scripts.Utils;
using UnityEngine;

namespace Assets.Scripts
{
    public class Creature : MonoBehaviour
    {
        public float Angle;
        public NeuralNetwork.NeuralNetwork Brain;
        public int Fitness;
        public int Generation;
        public double Life;
        public double LifeCost = 15;
        public double ParentChance;
        public bool ShowAntenna;
        public Bounds Bounds { get; set; }

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

            Life -= LifeCost*Time.deltaTime;

            SensoryInput input;
            input.Values = new double[4];

            var leftSensor = transform.position.ExtendedPoint(Angle - 45 + 90, 1);
            var rightSensor = transform.position.ExtendedPoint(Angle + 45 + 90, 1);
            if (ShowAntenna)
            {
                Debug.DrawLine(transform.position, leftSensor, Color.blue);
                Debug.DrawLine(transform.position, rightSensor, Color.red);
            }

            // could be that food supply is empty or out of reach
            var closestFood = GetClosestFood(foodSupply);
            {
                var closestFoodLeft = leftSensor.Distance(closestFood);
                var closestFoodRight = rightSensor.Distance(closestFood);

                if (closestFoodLeft > closestFoodRight)
                {
                    input.Values[0] = 1;
                    input.Values[1] = -1;
                }
                else
                {
                    input.Values[0] = -1;
                    input.Values[1] = 1;
                }
            }
            input.Values[2] = 0;
            input.Values[3] = 0;

            var output = Brain.Think(input);

            if (output.Values[0] > output.Values[1])
                Angle += (float) output.Values[0];
            else
                Angle -= (float) output.Values[1];

            transform.rotation = Quaternion.Euler(new Vector3(0, 0, Angle));

            transform.position += transform.up*(float) output.Values[2]*Time.deltaTime;

            ClampToBounds();

            return this;
        }

        private Food GetClosestFood(IEnumerable<Food> foodSupply)
        {
            Food closestFood = null;
            var closest = Mathf.Abs(Bounds.extents.x);
            foreach (var food in foodSupply)
            {
                var distance = Vector2.Distance(transform.position, food.transform.position);
                if (!(distance < closest)) continue;
                closestFood = food;
                closest = distance;
            }
            return closestFood;
        }

        private void ClampToBounds()
        {
            var pos = transform.position;
            pos.x = Mathf.Clamp(transform.position.x, Bounds.min.x, Bounds.max.x);
            pos.y = Mathf.Clamp(transform.position.y, Bounds.min.y, Bounds.max.y);
            pos.z = Mathf.Clamp(transform.position.z, Bounds.min.z, Bounds.max.z);
            transform.position = pos;
        }

        public Creature SpawnIn(Bounds bounds, int generation)
        {
            name = "Create [" + generation + "]";
            Brain = new NeuralNetwork.NeuralNetwork(0, 4, 250, 3);
            Generation = generation;
            transform.SetParent(GameObject.Find("Population").transform, true);
            Bounds = bounds;
            transform.rotation = Quaternion.Euler(new Vector3(0, 0, Angle));
            Init();
            transform.position = new Vector2(Random.Range(Bounds.min.x, Bounds.max.x),
                Random.Range(Bounds.min.y, Bounds.max.y));
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
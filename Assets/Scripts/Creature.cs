using System.Collections.Generic;
using Assets.Scripts.NeuralNetwork;
using Assets.Scripts.Utils;
using UnityEngine;

namespace Assets.Scripts
{
    public class Creature : MonoBehaviour
    {
        private float _previousSpeed;
        public float Angle;
        public NeuralNetwork.NeuralNetwork Brain;
        public int Fitness;
        public int Generation;
        public int HiddenLayerCount = 250;
        public SensoryInput Input;
        public int LearningFactor = 0;
        public double Life;
        public double LifeCost = 10;
        public NeuralOutput Output;
        public double ParentChance;
        public bool ShowAntenna;
        public bool ShowBrainSuggestions;
        public Bounds Bounds { get; set; }

        public bool IsDeath()
        {
            return Life <= 0 || gameObject == null;
        }

        public Creature Live(ICollection<Food> foodSupply)
        {
            if (IsDeath())
            {
                GetComponent<SpriteRenderer>().enabled = false;
                return this;
            }
            Life -= LifeCost*Time.deltaTime;

//            if (IsDeath())
//                Fitness -= 10;

            var closestFood = GetClosestFood(foodSupply);

            // could be that food supply is empty or out of reach
            if (closestFood == null)
            {
//                Debug.Log("no food found o.O");
                return this;
            }

            if (transform.position.Distance(closestFood) < 0.3)
            {
                Life += 50;
                Fitness += 10;
                closestFood.SpawnIn(Bounds);
            }

            Input.Values = new double[4];

            var leftSensor = transform.position.ExtendedPoint(Angle - 45 + 90, .5f);
            var rightSensor = transform.position.ExtendedPoint(Angle + 45 + 90, .5f);
            if (ShowAntenna)
            {
                Debug.DrawLine(transform.position, leftSensor, Color.blue);
                Debug.DrawLine(transform.position, rightSensor, Color.red);
            }

            var closestFoodLeft = leftSensor.Distance(closestFood);
            var closestFoodRight = rightSensor.Distance(closestFood);

            if (closestFoodLeft > closestFoodRight)
            {
                Input.Values[0] = closestFoodLeft;
                Input.Values[1] = -closestFoodRight;
            }
            else
            {
                Input.Values[0] = -closestFoodLeft;
                Input.Values[1] = closestFoodRight;
            }
            Input.Values[0] /= Bounds.extents.x;
            Input.Values[1] /= Bounds.extents.y;

            Output = Brain.Think(Input);

            var angle = (float) Output.Values[0];
//            Angle += angle*2
            if (angle <= 0.5)
            {
                Angle -= (1 - angle)*2;
                if (ShowBrainSuggestions) Debug.DrawLine(transform.position, leftSensor, Color.blue);
            }
            else
            {
                Angle += angle*2;
                if (ShowBrainSuggestions) Debug.DrawLine(transform.position, rightSensor, Color.red);
            }

            if (Output.Values[0] > Output.Values[1])
            {
                Angle -= (float) Output.Values[0];
                if (ShowBrainSuggestions) Debug.DrawLine(transform.position, leftSensor, Color.blue);
            }
            else
            {
                Angle += (float) Output.Values[1];
                if (ShowBrainSuggestions) Debug.DrawLine(transform.position, rightSensor, Color.red);
            }

            // rotate
            transform.rotation = Quaternion.Euler(new Vector3(0, 0, Angle));

            // draw speed 
            var speed = (float) Output.Values[1]*Time.deltaTime * 2;
            if (ShowBrainSuggestions)
                Debug.DrawLine(transform.position, transform.position.ExtendedPoint(Angle + 90, speed), Color.black);

            // move
            _previousSpeed = speed;
            transform.position += transform.up*Mathf.Abs(_previousSpeed);

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
            Brain = new NeuralNetwork.NeuralNetwork(LearningFactor, 4, HiddenLayerCount, 2);
            name = "Create [" + generation + "]";
            Generation = generation;
            transform.SetParent(GameObject.Find("Population").transform, true);
            Bounds = bounds;
            Init();
            transform.position = new Vector2(Random.Range(Bounds.min.x, Bounds.max.x),
                Random.Range(Bounds.min.y, Bounds.max.y));
            return this;
        }

        public void Init()
        {
            transform.rotation = Quaternion.Euler(new Vector3(0, 0, Angle));
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
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
        public double LifeCost = 10;
        public double ParentChance;
        public bool ShowAntenna;
        public Bounds Bounds { get; set; }

        public int LearningFactor = 0;
        public int HiddenLayerCount = 250;

        public bool IsDeath()
        {
            return Life <= 0 || gameObject == null;
        }

        public SensoryInput Input;
        public NeuralOutput Output;

        public Creature Live(ICollection<Food> foodSupply)
        {
            if (IsDeath())
            {
                GetComponent<SpriteRenderer>().enabled = false;
                return this;
            }

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

            Life -= LifeCost*Time.deltaTime;

            if (IsDeath())
                Fitness -= 50;

           
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
                Input.Values[0] = closestFoodLeft + closestFoodRight;
                Input.Values[1] = closestFoodLeft - closestFoodRight;
            }
            else
            {
                Input.Values[0] = closestFoodRight - closestFoodLeft;
                Input.Values[1] = closestFoodRight + closestFoodLeft;
            }

//            Input.Values[0] = Mathf.Abs((float) closestFoodLeft);
//            Input.Values[1] = -Mathf.Abs((float)closestFoodLeft);
//            Input.Values[0] = Mathf.Clamp((float) closestFoodLeft / Bounds.min.x, -1, 1);
//            Input.Values[1] = Mathf.Clamp((float) closestFoodRight / Bounds.min.x, -1, 1); 
            Input.Values[2] = 0;
            Input.Values[3] = 0;

            Output = Brain.Think(Input);

            if (Output.Values[0] > Output.Values[1])
            {
                Angle -= (float)Output.Values[0];
                Debug.DrawLine(transform.position, leftSensor, Color.blue);
            }
            else
            {
                Angle += (float)Output.Values[1];
                Debug.DrawLine(transform.position, rightSensor, Color.red);
            }

            // rotate
            transform.rotation = Quaternion.Euler(new Vector3(0, 0, Angle));

            // draw speed 
            var speed = (float)Output.Values[2];
            Debug.DrawLine(transform.position, transform.position.ExtendedPoint(Angle+90, speed), Color.black);
            
            // move
            transform.position += transform.up * speed * Time.deltaTime;

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
            Brain = new NeuralNetwork.NeuralNetwork(LearningFactor, 4, HiddenLayerCount, 3);
            Generation = generation;
            transform.SetParent(GameObject.Find("Population").transform, true);
            Bounds = bounds;
            Init(); 
            transform.position = new Vector2(Random.Range(Bounds.min.x, Bounds.max.x),Random.Range(Bounds.min.y, Bounds.max.y));
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
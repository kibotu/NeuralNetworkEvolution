using System;
using System.Collections;
using UnityEngine;
using Random = System.Random;

namespace Assets.Sources
{
    public class Creature : MonoBehaviour
    {
        [SerializeField]
        private int Life;
        [SerializeField]
        private int Angle;
        [SerializeField]
        private int Fitness;

        private Random Random { get; set; }

        public Bounds Bounds { get; set; }

        public bool IsDeath()
        {
            return Life <= 0;
        }

        public void Live(ArrayList foodSupply)
        {
            if (IsDeath())
                return;
        }

        public void SpawnIn(Bounds bounds)
        {
            Bounds = bounds;
            Random = new Random(Guid.NewGuid().GetHashCode());
            Angle = Random.Next(0, 360);
            transform.position = new Vector2(Random.Next((int)Bounds.min.x, (int)Bounds.max.x), Random.Next((int)Bounds.min.y, (int)Bounds.max.y));
            // transform.Rotate(Angle);
        }
    }
}

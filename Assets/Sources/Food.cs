using System;
using UnityEngine;
using Random = System.Random;

namespace Assets.Sources
{
    public class Food  : MonoBehaviour {

        public void SpawnIn(Bounds bounds)
        {
            var random= new Random(Guid.NewGuid().GetHashCode());
            transform.position = new Vector2(random.Next((int)bounds.min.x, (int)bounds.max.x), random.Next((int)bounds.min.y, (int)bounds.max.y));
        }
    }
}

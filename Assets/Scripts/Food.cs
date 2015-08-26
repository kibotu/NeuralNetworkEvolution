using UnityEngine;

namespace Assets.Scripts
{
    public class Food : MonoBehaviour
    {
        public void SpawnIn(Bounds bounds)
        {
            transform.SetParent(GameObject.Find("Food Supply").transform, true);
            transform.position = new Vector3(Random.Range(bounds.min.x, bounds.max.x),
                Random.Range(bounds.min.y, bounds.max.y),0);
        }
    }
}
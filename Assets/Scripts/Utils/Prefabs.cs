using UnityEngine;

namespace Assets.Scripts.Utils
{
    public class Prefabs : MonoBehaviour
    {
        public GameObject CreatePrefab;
        public GameObject FoodPrefab;
        public static Prefabs Instance { get; set; }

        private void Awake()
        {
            Instance = this;
        }

        public static GameObject CreateGameObject<T>(T type) where T : Object
        {
            if (type == null) Debug.LogError("Assigned Prefab missing. (Inspector)");
            return Instantiate(type) as GameObject;
        }

        public static Creature CreateCreature()
        {
            return Instance.CreatePrefab.Instantiate().GetComponent<Creature>();
        }

        public static Food CreateFood()
        {
            return Instance.FoodPrefab.Instantiate().GetComponent<Food>();
        }
    }
}
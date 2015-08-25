using UnityEngine;

namespace Assets.Scripts.Utils
{
    public static class PrefabsExtensions 
    {
        public static GameObject Instantiate(this GameObject go)
        {
            return Prefabs.CreateGameObject(go);
        }
    }
}

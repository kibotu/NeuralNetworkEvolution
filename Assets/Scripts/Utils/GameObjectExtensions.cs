using UnityEngine;

namespace Assets.Scripts.Utils
{
    public static class GameObjectExtensions {

        public static void Destroy(this GameObject gameObject) {
            Object.Destroy(gameObject);
        }
    }
}

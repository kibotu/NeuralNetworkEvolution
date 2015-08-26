using UnityEngine;

namespace Assets.Scripts.Utils
{
    public class AmountChildren : MonoBehaviour
    {
        public int ChildrenCount;

        private void Update()
        {
            ChildrenCount = GetComponentInChildren<Transform>().childCount;
        }
    }
}
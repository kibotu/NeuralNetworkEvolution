using UnityEngine;

namespace Assets.Scripts.Utils
{
    public class AmountChildren : MonoBehaviour
    {
        public int ChildrenCount;
	
        void Update ()
        {
            ChildrenCount = GetComponentInChildren<Transform>().childCount;
        }
    }
}

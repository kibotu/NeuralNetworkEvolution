using UnityEngine;

namespace Assets.Scripts.Utils
{
    public class NameUpdaterByChildrenCount : MonoBehaviour
    {
        private string _startName;

        private void Start()
        {
            _startName = name;
        }

        private void Update()
        {
            name = _startName + " [" + GetComponentInChildren<Transform>().childCount + "]";
        }
    }
}
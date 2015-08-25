using UnityEngine;

namespace Assets.Scripts.Utils
{
    public class NameUpdaterByChildrenCount : MonoBehaviour {

        private string _startName;

        void Start()
        {
            _startName = name;
        }

        void Update () {
            name = _startName + " [" + GetComponentInChildren<Transform>().childCount + "]";
        }
    }
}

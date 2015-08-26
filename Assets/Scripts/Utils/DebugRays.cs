using UnityEngine;

namespace Assets.Scripts.Utils
{
    public class DebugRays : MonoBehaviour
    {
        public bool CameraUpVector;
        public bool DirectionTowardsCamera;
        public bool DirectionTowardsTarget;
        public bool ForwardVector;
        public GameObject Target;
        public bool UpVector;

        public void Update()
        {
            if (ForwardVector) Debug.DrawRay(transform.position, transform.forward, Color.cyan);
            if (UpVector) Debug.DrawRay(transform.position, transform.up, Color.black);
            if (CameraUpVector) Debug.DrawRay(transform.position, Camera.main.transform.rotation*Vector3.up, Color.red);
            if (DirectionTowardsCamera)
                Debug.DrawRay(transform.position, transform.position + Camera.main.transform.rotation*Vector3.forward,
                    Color.blue);
            if (DirectionTowardsTarget && Target != null)
                Debug.DrawRay(transform.position, transform.position.Direction(Target.transform.position), Color.magenta);
        }
    }
}
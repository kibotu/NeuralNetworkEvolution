using UnityEngine;

namespace Assets.Scripts.Utils
{
    public class Function : MonoBehaviour {

        private delegate float FunctionDelegate(Vector3 p, float t);
        private int _currentResolution;
        [Range(10, 100)]
        public int Resolution = 10;
        private ParticleSystem.Particle[] _points;

        public FunctionOption _function;
        public enum FunctionOption
        {
            Linear,
            Exponential,
            Parabola,
            Sine,
            Ripple
        }

        ParticleSystem _particleStystem;

        private static readonly FunctionDelegate[] FunctionDelegates = {
            Linear,
            Exponential,
            Parabola,
            Sine,
		    Ripple
        };

        void Start()
        {
            _particleStystem = GetComponent<ParticleSystem>();
            CreatePoints();
      
        }

        void CreatePoints()
        {
            if (Resolution < 10 || Resolution > 100)
            {
                Debug.LogWarning("resolution out of bounds, resetting to minimum.", this);
                Resolution = 10;
            } 
            _currentResolution = Resolution;
            _points = new ParticleSystem.Particle[Resolution * Resolution];
            float increment = 1f / (Resolution - 1);
            int i = 0;
            for (int x = 0; x < Resolution; x++)
            {
                for (int z = 0; z < Resolution; z++)
                {
                    Vector3 p = new Vector3(x * increment, 0f, z * increment);
                    _points[i].position = p;
                    _points[i].color = new Color(p.x, 0f, p.z);
                    _points[i++].size = 0.1f;
                }
            }
        }

        void Update()
        {
            if (_currentResolution != Resolution || _points == null)
            {
                CreatePoints();
            }
            for (var i = 0; i < _points.Length; i++)
            {
                var f = FunctionDelegates[(int)_function];
                var p = _points[i].position;
                var t = Time.timeSinceLevelLoad;
                p.y = f(p,t);
                _points[i].position = p;
                Color c = _points[i].color;
                c.g = p.y;
                _points[i].color = c;
            }
            _particleStystem.SetParticles(_points, _points.Length);
        }

        private static float Linear(Vector3 p, float t)
        {
            return p.x;
        }

        private static float Exponential(Vector3 p, float t)
        {
            return p.x * p.x;
        }
        private static float Parabola(Vector3 p, float t)
        {
            p.x += p.x - 1f;
            p.z += p.z - 1f;
            return 1f - p.x * p.x * p.z * p.z;
        }
        private static float Sine(Vector3 p, float t)
        {
            return 0.50f +
            0.25f * Mathf.Sin(4f * Mathf.PI * p.x + 4f * t) * Mathf.Sin(2f * Mathf.PI * p.z + t) +
            0.10f * Mathf.Cos(3f * Mathf.PI * p.x + 5f * t) * Mathf.Cos(5f * Mathf.PI * p.z + 3f * t) +
            0.15f * Mathf.Sin(Mathf.PI * p.x + 0.6f * t);
        }

        private static float Ripple(Vector3 p, float t)
        {
            p.x -= 0.5f;
            p.z -= 0.5f;
            float squareRadius = p.x * p.x + p.z * p.z;
            return 0.5f + Mathf.Sin(15f * Mathf.PI * squareRadius - 2f * t) / (2f + 100f * squareRadius);
        }
    }
}

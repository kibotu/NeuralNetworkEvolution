using System;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Assets.Scripts.Utils
{
    public static class MathUtilityHelper
    {
        public static Vector3 Direction(this Vector3 source, Vector3 target)
        {
            return (target - source).normalized;
        }

        public static float Distance(this Vector3 source, Vector3 target)
        {
            return Vector3.Distance(target, source);
        }

        public static double Distance(this Vector3 position, Component component)
        {
            return Vector3.Distance(position, component.transform.position);
        }

        public static double Distance(this Vector2 position, Component component)
        {
            return Vector2.Distance(position, component.transform.position);
        }

        public static float Range(float min, float max, float excludeRangeMin, float excludeRangeMax)
        {
            return Random.Range(0, 2) == 0 ? Random.Range(min, excludeRangeMin) : Random.Range(excludeRangeMax, max);
        }

        public static float ComputeVelocity(float acceleration, float startVelocity = 0f)
        {
            return startVelocity + acceleration*Time.time;
        }

        /// <summary>
        ///     @return the angle in degrees of this vector (point) relative to the x-axis. Angles are towards the positive y-axis
        ///     (typically
        ///     counter-clockwise) and between 0 and 360.
        /// </summary>
        public static float Angle(this Vector2 v)
        {
            var angle = Mathf.Atan2(v.y, v.x)*Mathf.Rad2Deg;
            if (angle < 0) angle += 360;
            return angle;
        }

        /// <summary>
        ///     Returns an extended Vector.
        /// </summary>
        /// <param name="position">center</param>
        /// <param name="directionAngle">angle in degree</param>
        /// <param name="length"></param>
        /// <returns></returns>
        public static Vector2 ExtendedPoint(this Vector3 position, float directionAngle, float length)
        {
            var radians = directionAngle*Mathf.Deg2Rad;
            return new Vector2(position.x + Mathf.Cos(radians)*length, position.y + Mathf.Sin(radians)*length);
        }

        /// <summary>
        ///     Logistic Activation Function
        /// </summary>
        /// <param name="x"></param>
        /// <returns>value between 0 and 1</returns>
        public static double BipolarSigmoid(double x)
        {
            return (1/(1 + Math.Exp(x*-1)));
        }

        /// <summary>
        ///     Hpyerbolic Tangent Activation Function
        /// </summary>
        /// <param name="x"></param>
        /// <returns>returns value between -1 and 1</returns>
        public static double HyperbolicTangent(double x)
        {
            return (1 - Math.Exp(-2*x))/(1 + Math.Exp(-2*x));
        }
    }
}
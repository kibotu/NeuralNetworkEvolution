using System;

namespace Assets.Sources.NeuralNetwork
{
    [Serializable]
    public class NeuralNetwork  {

        public double Fitness;

        public NN Network;

        public double[] GetWeights()
        {
            return null;
        }

        public double BipolarSigmoid(double x)
        {
            return (1 / (1 + Math.Exp(x * -1)));
        }
    }
}

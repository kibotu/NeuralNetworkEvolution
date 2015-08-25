using System;

namespace Assets.Scripts.NeuralNetwork
{
    [Serializable]
    public class NeuralNetwork  {

        public double Fitness;

        public NN Network;

        public double[] GetWeights()
        {
            return new double[2];
        }

        public double BipolarSigmoid(double x)
        {
            return (1 / (1 + Math.Exp(x * -1)));
        }

        public void SetWeights(double[] childWeights)
        {
                
        }

        public int DendritesCount()
        {
            return 0;
        }

        public NeuralOutput Think(SensoryInput input)
        {
            return new NeuralOutput{Left = 15, Right = 0.1, Speed = 0.1};
        }
    }
}

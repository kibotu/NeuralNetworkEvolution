using System;

namespace Assets.Scripts.NeuralNetwork
{
    [Serializable]
    public class Neuron
    {
        public Dendrite[] Dedrites;
        public double Bias;
        public double Value;
        public double Delta;
    }
}

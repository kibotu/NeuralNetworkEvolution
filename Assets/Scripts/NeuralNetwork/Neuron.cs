using System;

namespace Assets.Scripts.NeuralNetwork
{
    [Serializable]
    public struct Neuron
    {
        public Dendrite[] Dendrite;
        public double Bias;
        public double Value;
        public double Delta;
    }
}

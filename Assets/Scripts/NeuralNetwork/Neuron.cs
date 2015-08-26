using System;

namespace Assets.Scripts.NeuralNetwork
{
    [Serializable]
    public struct Neuron
    {
        public double Bias;
        public double Delta;
        public Dendrite[] Dendrite;
        public double Value;
    }
}
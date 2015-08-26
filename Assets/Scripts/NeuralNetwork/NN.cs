using System;

namespace Assets.Scripts.NeuralNetwork
{
    [Serializable]
    public struct NN
    {
        public Layer[] Layers;
        public double LearningRate;
    }
}
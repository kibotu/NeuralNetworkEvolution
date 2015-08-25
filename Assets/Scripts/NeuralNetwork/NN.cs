using System;

namespace Assets.Scripts.NeuralNetwork
{
    [Serializable]
    public class NN
    {
        public Layer[] Layers;
        public double LearningRate;
    }
}

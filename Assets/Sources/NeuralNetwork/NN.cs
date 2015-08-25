using System;

namespace Assets.Sources.NeuralNetwork
{
    [Serializable]
    public class NN
    {
        public Layer[] Layers;
        public double LearningRate;
    }
}

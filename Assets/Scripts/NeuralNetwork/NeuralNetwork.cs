using System;
using System.Collections.Generic;
using Random = UnityEngine.Random;

namespace Assets.Scripts.NeuralNetwork
{
    [Serializable]
    public class NeuralNetwork  {

        public double Fitness;

        public NN Network;

        public NeuralNetwork(double learningRate, int inputCount, int hiddenLayerCount, int outputCount)
        {
            Fitness = 0;
            Network.LearningRate = learningRate;
            BuildInitialNeuralNetwork(new[] {inputCount,hiddenLayerCount,outputCount});
        }

        private void BuildInitialNeuralNetwork(IList<int> layers)
        {
            Network.Layers = new Layer[layers.Count];

            for (var layer = 0; layer < layers.Count; ++layer)
            {
                var count = layers[layer];
                Network.Layers[layer].Neurons = new Neuron[count];

                for (var neuron = 0; neuron < count; ++neuron)
                {
                    if (layer == 0) continue;

                    Network.Layers[layer].Neurons[neuron].Bias = NextRandom();
                    Network.Layers[layer].Neurons[neuron].Dedrites = new Dendrite[layers[layer - 1]];
                    for (var dendrite = 0; dendrite <  Network.Layers[layer].Neurons[neuron].Dedrites.Length; dendrite++)
                    {
                        Network.Layers[layer].Neurons[neuron].Dedrites[dendrite].Weight = NextRandom();
                    }
                }
            }
        }

        private static double NextRandom()
        {
            return Random.Range(1f,2f);
        }

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

using System;
using System.Collections.Generic;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Assets.Scripts.NeuralNetwork
{
    [Serializable]
    public class NeuralNetwork
    {
        public double Fitness;
        public NN Network;

        public NeuralNetwork(double learningRate, int inputCount, int hiddenLayerCount, int outputCount)
        {
            Fitness = 0;
            Network.LearningRate = learningRate;
            BuildInitialNeuralNetwork(new[] {inputCount, hiddenLayerCount, outputCount});
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
                    Network.Layers[layer].Neurons[neuron].Dendrite = new Dendrite[layers[layer - 1]];
                    for (var dendrite = 0; dendrite < Network.Layers[layer].Neurons[neuron].Dendrite.Length; dendrite++)
                    {
                        Network.Layers[layer].Neurons[neuron].Dendrite[dendrite].Weight = NextRandom();
                    }
                }
            }
        }

        private static double NextRandom()
        {
            return Random.Range(1f, 2f);
        }

        public double[] GetWeights()
        {
            return new double[2];
        }

        public double BipolarSigmoid(double x)
        {
            return (1/(1 + Math.Exp(x*-1)));
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
            for (var layer = 0; layer < Network.Layers.Length; ++layer)
            {
                for (var neuron = 0; neuron < Network.Layers[layer].Neurons.Length; neuron++)
                {
                    if (layer == 0)
                        Network.Layers[layer].Neurons[neuron].Value = input.Values[neuron];
                    else
                    {
                        Network.Layers[layer].Neurons[neuron].Value = 0;
                        for (var dentrite = 0; dentrite < Network.Layers[layer - 1].Neurons.Length; ++dentrite)
                        {
                            Network.Layers[layer].Neurons[neuron].Value = Network.Layers[layer].Neurons[neuron].Value +
                                                                          Network.Layers[layer - 1].Neurons[dentrite]
                                                                              .Value*
                                                                          Network.Layers[layer].Neurons[neuron].Dendrite
                                                                              [dentrite].Weight;
                        }
                        Network.Layers[layer].Neurons[neuron].Value =
                            BipolarSigmoid(Network.Layers[layer].Neurons[neuron].Value);
                    }
                }
            }

            NeuralOutput output;
            output.Values = new double[Network.Layers[Network.Layers.Length - 1].Neurons.Length];
            for (var neuron = 0; neuron < output.Values.Length; ++neuron)
            {
                output.Values[neuron] =
                    Mathf.Clamp((float) Network.Layers[Network.Layers.Length - 1].Neurons[neuron].Value, -1, 1);
            }

            return output;
        }
    }
}
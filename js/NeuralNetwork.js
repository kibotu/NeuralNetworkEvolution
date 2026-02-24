import { hyperbolicTangent, randomRange } from './utils.js';

export class NeuralNetwork {
  constructor(inputCount, hiddenLayerCount, outputCount) {
    this.layers = [];
    const layerSizes = [inputCount, hiddenLayerCount, outputCount];

    for (let i = 0; i < layerSizes.length; i++) {
      const layer = { neurons: [] };

      for (let j = 0; j < layerSizes[i]; j++) {
        const neuron = { value: 0, bias: 0, dendrites: [] };

        if (i > 0) {
          const fanIn = layerSizes[i - 1];
          const fanOut = layerSizes[i];
          const limit = Math.sqrt(6 / (fanIn + fanOut));
          neuron.bias = randomRange(-limit, limit);

          for (let k = 0; k < fanIn; k++) {
            neuron.dendrites.push({ weight: randomRange(-limit, limit) });
          }
        }

        layer.neurons.push(neuron);
      }

      this.layers.push(layer);
    }
  }

  think(inputValues) {
    for (let i = 0; i < this.layers[0].neurons.length; i++) {
      this.layers[0].neurons[i].value = inputValues[i];
    }

    for (let layer = 1; layer < this.layers.length; layer++) {
      for (let neuron = 0; neuron < this.layers[layer].neurons.length; neuron++) {
        const n = this.layers[layer].neurons[neuron];
        let sum = n.bias;

        for (let p = 0; p < this.layers[layer - 1].neurons.length; p++) {
          sum += this.layers[layer - 1].neurons[p].value * n.dendrites[p].weight;
        }

        n.value = hyperbolicTangent(sum);
      }
    }

    return this.layers[this.layers.length - 1].neurons.map(n => n.value);
  }

  getWeights() {
    const weights = [];
    for (let layer = 1; layer < this.layers.length; layer++) {
      for (let neuron = 0; neuron < this.layers[layer].neurons.length; neuron++) {
        const n = this.layers[layer].neurons[neuron];
        weights.push(n.bias);
        for (let d = 0; d < n.dendrites.length; d++) {
          weights.push(n.dendrites[d].weight);
        }
      }
    }
    return weights;
  }

  setWeights(weights) {
    let idx = 0;
    for (let layer = 1; layer < this.layers.length; layer++) {
      for (let neuron = 0; neuron < this.layers[layer].neurons.length; neuron++) {
        const n = this.layers[layer].neurons[neuron];
        n.bias = weights[idx++];
        for (let d = 0; d < n.dendrites.length; d++) {
          n.dendrites[d].weight = weights[idx++];
        }
      }
    }
  }

  getDendriteCount() {
    let count = 0;
    for (let layer = 1; layer < this.layers.length; layer++) {
      for (let neuron = 0; neuron < this.layers[layer].neurons.length; neuron++) {
        count += this.layers[layer].neurons[neuron].dendrites.length;
      }
    }
    return count;
  }

  clone() {
    const inputCount = this.layers[0].neurons.length;
    const hiddenCount = this.layers[1].neurons.length;
    const outputCount = this.layers[2].neurons.length;
    const copy = new NeuralNetwork(inputCount, hiddenCount, outputCount);
    copy.setWeights(this.getWeights());
    return copy;
  }
}

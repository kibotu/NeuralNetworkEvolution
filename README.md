# Neural Network Evolution

Training neural networks using evolutionary algorithms. Creatures learn to find food through natural selection -- no backpropagation, no gradient descent, just survival of the fittest.

Originally a Unity project, now ported to browser-based WebGL with Three.js.

![Screenshot](https://raw.githubusercontent.com/kibotu/NeuralNetworkEvolution/master/screenshot.png)

## Quick Start

```bash
./run_simulation.sh
```

Or manually: `python3 -m http.server 8000` and open http://localhost:8000.

## How It Works

Each creature has a small neural network brain (4 inputs, 250 hidden neurons, 2 outputs) that controls its rotation and speed. Two antenna sensors at +/-45 degrees detect the nearest food source.

Creatures start with 100 health, lose 10/sec, gain 50 per food collected. At 0 health, they die.

After each generation (configurable duration), a genetic algorithm selects the best performers:
- **Elitism**: Top 40% survive unchanged
- **Crossover**: Single-point crossover of neural network weights
- **Mutation**: 1% chance of random weight modification

By generation 5-10, creatures reliably navigate toward food.

## GPT-Trained Variant

The `gpt-insects/` folder contains an alternative approach: instead of evolutionary algorithms, a micro GPT transformer (~4K params, 1-layer, 4-head, 16-dim) learns to control the insects via behavioral cloning on successful trajectories.

```bash
./gpt-insects/run.sh
```

The simulation cycles between SIMULATING (insects act using the current GPT weights) and TRAINING (top trajectories train the model via next-token prediction).

## Controls

- **Pause/Resume/Restart**: Simulation flow
- **Speed**: 0.1x to 5x
- **Population**: 10-200 creatures
- **Food Supply**: 10-300 items
- **Generation Duration**: 5-120 seconds
- **Hidden Neurons**: 50-500
- **Mutation Rate**: 0-10%
- **Crossover Rate**: 20-80%

## Project Structure

```
index.html                  Main application
js/
  main.js                   Three.js setup and animation loop
  World.js                  Simulation manager
  Creature.js               Creature with neural network brain
  Food.js                   Food spawning
  NeuralNetwork.js          Feed-forward neural network
  GeneticAlgorithm.js       Evolution logic
  utils.js                  Math utilities
  vendor/three.min.js       Three.js r128 (self-hosted)
gpt-insects/                GPT transformer variant
```

## Tech Stack

Pure JavaScript (ES6 modules), Three.js for WebGL rendering, no other dependencies.

## Contact

[Jan Rabe](mailto:janrabe@kibotu.net)

## License

See [LICENSE](LICENSE) file.

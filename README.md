# Neuroevolution

Training neural networks without training neural networks.

No backpropagation. No gradient descent. No loss function. Just little bug creatures trying not to starve — and a genetic algorithm making sure the dumb ones don't reproduce.

**[Live Demo](https://kibotu.github.io/NeuralNetworkEvolution/)**

![Demo](docs/clip.gif)

## What's happening here?

Each creature has a tiny feed-forward neural network for a brain. It takes in sensory inputs (where's the food? how close is the wall? how fast am I going?) and outputs two decisions: how much to turn and how fast to move.

Generation 1 is pure chaos — random weights, random movement, random death. But the creatures that *happen* to stumble toward food survive longer and score higher fitness. A genetic algorithm then breeds the next generation from the winners: their neural network weights get mixed, slightly mutated, and handed to fresh creatures.

By generation 5–10, they start reliably navigating toward food. Nobody taught them. They figured it out through trial, error, and natural selection.

It's evolution, speedrun.

## The neural network

```
Inputs (6)              Hidden Layer (configurable)          Outputs (2)
┌──────────────────┐    ┌──────────────────────────┐    ┌─────────────────┐
│ Relative angle   │───▶│                          │───▶│ Rotation rate   │
│ Food proximity   │───▶│   tanh-activated neurons │───▶│ Movement speed  │
│ Angle cosine     │───▶│   (default: 10)          │    └─────────────────┘
│ Antenna diff     │───▶│                          │
│ Wall proximity X │───▶│                          │
│ Wall proximity Y │───▶│                          │
└──────────────────┘    └──────────────────────────┘
```

Each creature has two antenna sensors at ±25° from its forward direction. The difference in distance from each antenna tip to the nearest food gives the network a sense of "food is to my left/right." Combined with the relative angle and proximity, the network has enough information to steer — if the weights are right.

The weights start random. Evolution makes them right.

## The genetic algorithm

After each generation (configurable duration, default 20s):

1. **Fitness scoring** — creatures earn points for eating food and staying close to food sources. Wall collisions and dying early are penalized.
2. **Tournament selection** — pick 3 random creatures, keep the fittest. Repeat.
3. **Elitism** — the top performers survive to the next generation unchanged (their brains were working, don't mess with them).
4. **Crossover** — two parent creatures' weight arrays are spliced at a random point to produce a child. Half mom's brain, half dad's brain. What could go wrong?
5. **Mutation** — small random perturbations to weights. Keeps the gene pool from converging too early and getting stuck in local optima.

The crossover/elitism ratio and mutation rate are all tunable via sliders.

## Running it

It's a static site. Serve it however you like:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

Or just visit the **[live demo on GitHub Pages](https://kibotu.github.io/NeuralNetworkEvolution/)**.

## Controls

| Control | What it does |
|---|---|
| **Speed** | Simulation time multiplier (0.1x–10x). Crank it up to watch evolution happen faster. |
| **Population** | Number of creatures per generation (10–200) |
| **Food Supply** | How much food is scattered around (10–300) |
| **Duration** | How long each generation runs before evolving (5–120s) |
| **Hidden Neurons** | Size of the hidden layer (4–128). More neurons = more complex behavior but slower evolution. |
| **Mutation Rate** | Chance of random weight tweaks (0–30%) |
| **Crossover Rate** | How much of the population is bred vs. kept as-is (20–80%) |
| **Visualization toggles** | Show target vectors, velocity, antenna sensors, rotation arcs |

Click **Apply** after changing parameters to restart with new settings.

## Project structure

```
index.html              Entry point
css/style.css           Styling
js/
  main.js               Three.js scene, rendering, UI
  World.js              Simulation loop and generation lifecycle
  Creature.js           Creature behavior, sensing, movement
  Food.js               Food spawning and collection
  NeuralNetwork.js      Feed-forward network (think, getWeights, setWeights)
  GeneticAlgorithm.js   Selection, crossover, mutation, elitism
  utils.js              Math helpers (distance, tanh, random)
  vendor/three.min.js   Three.js r128
```

## Tech

Pure JavaScript (ES6 modules) + Three.js for WebGL rendering. Zero build step, zero npm, zero bundler. Just files and a browser.

## License

See [LICENSE](LICENSE).

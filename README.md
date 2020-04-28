Neural Network Evolution
============================================

### Introduction

Training a neural network using evolutionary algorithm as fitness indicator. 

![Screenshot](https://raw.githubusercontent.com/kibotu/NeuralNetworkEvolution/master/screenshot.png)

![Screenshot](https://raw.githubusercontent.com/kibotu/NeuralNetworkEvolution/master/screenshot2.png)

### Creatures

Each creature has 2 inputs and 2 outputs. 

As input: 2 antennas which compute the *directional angle* towards the closest food source and forwards it to the brain (neural network).

As output it computes the rotation *angle* and also the *speed* for the next turn. Note: a creature can only rotate few degrees each turn. 

# Simulation

The simulation runs for 10 seconds with 150 food sources and an initial population of 100 creature.

Each creature starts with 100 life and loses 10 each second. However if it collects a food source it gains 10 life. 

At 0 life it dies. 

After the 10 seconds the 10% best and 10% worst performing creatures are put into a pool and are used as parents. 

The population gets filled up back to the initial population by creating children. 

A child is created by two randomly selected parents and mixing their brains and therefore passing their traits to the next generation. 

The simulation is then run for a few generations. Usually after 5-10 generations the children have learned to collect food. 


### Unity3D 2019.3.11f1

### Contact
* [Jan Rabe](mailto:janrabe@kibotu.net)

import { World } from './World.js';

let scene, camera, renderer;
let world;
let creatureMeshes = [];
let foodMeshes = [];
let lastTime = 0;
let lastGenerationCount = 0;

let showTargetVectors = false;
let showVelocityVectors = false;
let showAntennaVectors = false;
let showRotationVectors = false;
let targetVectorLines = [];
let velocityVectorLines = [];
let antennaVectorLines = [];
let rotationVectorLines = [];
let gridHelper = null;
let boundaryMesh = null;

// Fitness chart history
let fitnessHistory = { avg: [], best: [] };

// Tracks whether 2D chart canvases need resizing
let chartCanvasesNeedResize = true;

function sizeCanvasForHiDPI(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const dpr = window.devicePixelRatio || 1;
  const needsResize = canvas.width !== Math.round(rect.width * dpr) ||
                      canvas.height !== Math.round(rect.height * dpr);
  if (needsResize) {
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w: rect.width, h: rect.height, ctx, dpr };
}

const el = {
  pauseBtn: null, restartBtn: null, cloneBtn: null, applyBtn: null,
  speedSlider: null, speedValue: null,
  populationSlider: null, populationValue: null,
  foodSlider: null, foodValue: null,
  ticksSlider: null, ticksValue: null,
  hiddenLayerSlider: null, hiddenLayerValue: null,
  mutationSlider: null, mutationValue: null,
  crossoverSlider: null, crossoverValue: null,
  worldSizeSlider: null, worldSizeValue: null,
  minSpeedSlider: null, minSpeedValue: null,
  maxSpeedSlider: null, maxSpeedValue: null,
  minRotationSlider: null, minRotationValue: null,
  maxRotationSlider: null, maxRotationValue: null,
  generation: null, aliveCount: null, deadCount: null,
  currentTick: null, avgFitness: null, bestFitness: null,
  foodEaten: null, totalTime: null,
  generationTableBody: null,
  fitnessChart: null, nnDiagram: null,
  generationProgress: null, progressLabel: null
};

function bindElements() {
  for (const key of Object.keys(el)) {
    el[key] = document.getElementById(key);
  }
}

// ─── Three.js setup ───

function initThreeJS() {
  const canvas = document.getElementById('simulationCanvas');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  const aspect = canvas.clientWidth / canvas.clientHeight;
  const viewSize = 12;
  camera = new THREE.OrthographicCamera(
    -viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 1000
  );
  camera.position.z = 10;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const directional = new THREE.DirectionalLight(0xffffff, 0.4);
  directional.position.set(5, 5, 10);
  scene.add(directional);

  initVectorLines();
  window.addEventListener('resize', () => {
    updateCamera();
    chartCanvasesNeedResize = true;
  });
}

function initVectorLines() {
  const makePool = (count, color) => {
    const pool = [];
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
      line.visible = false;
      scene.add(line);
      pool.push(line);
    }
    return pool;
  };

  targetVectorLines = makePool(200, 0xff4444);
  velocityVectorLines = makePool(200, 0x4488ff);

  for (let i = 0; i < 800; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const color = i % 4 < 2 ? 0xffaa00 : 0xffdd44;
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
    line.visible = false;
    scene.add(line);
    antennaVectorLines.push(line);
  }

  const arcSegments = 9;
  for (let i = 0; i < 200; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((arcSegments + 1) * 3), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x44ff44 }));
    line.visible = false;
    scene.add(line);
    rotationVectorLines.push(line);
  }
}

function updateCamera() {
  const canvas = document.getElementById('simulationCanvas');
  const aspect = canvas.clientWidth / canvas.clientHeight;
  const worldSize = world ? (world.config.bounds.max.x - world.config.bounds.min.x) : 20;
  const viewSize = worldSize * 0.6;

  camera.left = -viewSize * aspect;
  camera.right = viewSize * aspect;
  camera.top = viewSize;
  camera.bottom = -viewSize;
  camera.updateProjectionMatrix();
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

function updateWorldGeometry() {
  if (gridHelper) scene.remove(gridHelper);
  if (boundaryMesh) scene.remove(boundaryMesh);

  const worldSize = world ? (world.config.bounds.max.x - world.config.bounds.min.x) : 20;
  gridHelper = new THREE.GridHelper(worldSize, Math.min(worldSize, 40), 0x444444, 0x222222);
  gridHelper.rotation.x = Math.PI / 2;
  scene.add(gridHelper);

  const bGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(worldSize, worldSize));
  boundaryMesh = new THREE.LineSegments(bGeo, new THREE.LineBasicMaterial({ color: 0x00ffff }));
  scene.add(boundaryMesh);
}

// ─── Creature meshes with fitness-ranked colors ───

function createCreatureMeshes() {
  const currentSet = new Set(world.creatures);
  for (let i = creatureMeshes.length - 1; i >= 0; i--) {
    const mesh = creatureMeshes[i];
    const owner = world.creatures.find(c => c.mesh === mesh);
    if (!owner || !currentSet.has(owner)) {
      scene.remove(mesh);
      creatureMeshes.splice(i, 1);
    }
  }

  for (const creature of world.creatures) {
    if (!creature.mesh || !creature.mesh.parent) {
      const group = new THREE.Group();

      const bodyGeo = new THREE.CircleGeometry(0.25, 16);
      const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff6b6b, emissive: 0x330000 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.scale.set(1, 1.3, 1);
      group.add(body);

      const headGeo = new THREE.CircleGeometry(0.15, 16);
      const headMat = new THREE.MeshPhongMaterial({ color: 0xff8888, emissive: 0x440000 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, 0.3, 0.01);
      group.add(head);

      const eyeGeo = new THREE.CircleGeometry(0.05, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.06, 0.32, 0.02);
      group.add(leftEye);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
      rightEye.position.set(0.06, 0.32, 0.02);
      group.add(rightEye);

      const antGeo = new THREE.BufferGeometry();
      const av = new Float32Array([
        -0.04, 0.4, 0, -0.04 - Math.sin(25 * Math.PI / 180) * 0.15, 0.4 + Math.cos(25 * Math.PI / 180) * 0.15, 0,
        0.04, 0.4, 0, 0.04 + Math.sin(25 * Math.PI / 180) * 0.15, 0.4 + Math.cos(25 * Math.PI / 180) * 0.15, 0
      ]);
      antGeo.setAttribute('position', new THREE.BufferAttribute(av, 3));
      group.add(new THREE.LineSegments(antGeo, new THREE.LineBasicMaterial({ color: 0x884444 })));

      const wingGeo = new THREE.CircleGeometry(0.15, 12);
      const wingMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.3 });
      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(-0.25, 0, -0.01);
      leftWing.scale.set(1.2, 0.8, 1);
      group.add(leftWing);
      const rightWing = new THREE.Mesh(wingGeo, wingMat.clone());
      rightWing.position.set(0.25, 0, -0.01);
      rightWing.scale.set(1.2, 0.8, 1);
      group.add(rightWing);

      scene.add(group);
      creature.setMesh(group);
      creatureMeshes.push(group);
    }
  }
}

function updateCreatureColors() {
  if (!world?.creatures) return;

  const alive = world.creatures.filter(c => !c.isDead());
  if (alive.length === 0) return;

  const sorted = [...alive].sort((a, b) => b.fitness - a.fitness);
  const bestCreature = sorted[0];

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    if (!c.mesh?.children?.[0]?.material) continue;

    const rank = i / Math.max(1, sorted.length - 1);
    const body = c.mesh.children[0];

    if (i === 0) {
      // Gold for the best
      body.material.color.setRGB(1.0, 0.85, 0.2);
      body.material.emissive.setRGB(0.3, 0.25, 0.0);
      c.mesh.scale.set(1.15, 1.15, 1);
    } else {
      // Blue gradient for others (best = bright blue, worst = dim red)
      const r = 0.4 + rank * 0.6;
      const g = 0.3 * (1 - rank);
      const b = 0.8 * (1 - rank) + 0.2;
      body.material.color.setRGB(r, g, b);
      body.material.emissive.setRGB(0.05, 0, rank * 0.15);
      c.mesh.scale.set(1, 1, 1);
    }
  }
}

function createFoodMeshes() {
  foodMeshes.forEach(mesh => scene.remove(mesh));
  foodMeshes = [];

  for (const food of world.foodSupply) {
    const geo = new THREE.CircleGeometry(0.2, 16);
    const mat = new THREE.MeshPhongMaterial({ color: 0x51cf66, emissive: 0x003300 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    food.setMesh(mesh);
    foodMeshes.push(mesh);
  }
}

// ─── World initialization ───

function initWorld() {
  const config = {
    initialPopulation: parseInt(el.populationSlider.value),
    initialFoodSupply: parseInt(el.foodSlider.value),
    ticksPerGeneration: parseInt(el.ticksSlider.value),
    secondsPerTick: 1,
    hiddenLayerCount: parseInt(el.hiddenLayerSlider.value),
    crossoverRate: parseFloat(el.crossoverSlider.value),
    mutationRate: parseFloat(el.mutationSlider.value),
    minSpeed: parseFloat(el.minSpeedSlider.value),
    maxSpeed: parseFloat(el.maxSpeedSlider.value),
    minRotation: parseFloat(el.minRotationSlider.value),
    maxRotation: parseFloat(el.maxRotationSlider.value),
    speed: parseFloat(el.speedSlider.value),
    worldSize: parseInt(el.worldSizeSlider.value)
  };
  const half = config.worldSize / 2;
  config.bounds = { min: { x: -half, y: -half }, max: { x: half, y: half } };

  world = new World(config);
  world.init();
  fitnessHistory = { avg: [], best: [] };

  updateCamera();
  updateWorldGeometry();
  createCreatureMeshes();
  createFoodMeshes();
}

// ─── Fitness chart (Canvas 2D) ───

function drawFitnessChart() {
  const canvas = el.fitnessChart;
  if (!canvas) return;
  const { w: W, h: H, ctx } = sizeCanvasForHiDPI(canvas);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(0, 0, W, H);

  const pad = { top: 18, right: 16, bottom: 28, left: 48 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  if (fitnessHistory.avg.length < 2) {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for data\u2026', W / 2, H / 2);
    return;
  }

  const allVals = [...fitnessHistory.avg, ...fitnessHistory.best];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = maxVal - minVal || 1;
  const n = fitnessHistory.avg.length;

  const toX = i => pad.left + (i / Math.max(1, n - 1)) * plotW;
  const toY = v => pad.top + plotH - ((v - minVal) / range) * plotH;

  // Grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * plotH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
  }

  // Y-axis labels
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = minVal + ((4 - i) / 4) * range;
    ctx.fillText(val.toFixed(1), pad.left - 6, pad.top + (i / 4) * plotH + 3);
  }
  // X-axis labels
  ctx.textAlign = 'center';
  ctx.fillText('1', toX(0), H - 6);
  ctx.fillText(String(n), toX(n - 1), H - 6);
  ctx.fillText('Generation', pad.left + plotW / 2, H - 2);

  // Area fill
  ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
  ctx.beginPath();
  ctx.moveTo(toX(0), pad.top + plotH);
  for (let i = 0; i < fitnessHistory.best.length; i++) ctx.lineTo(toX(i), toY(fitnessHistory.best[i]));
  ctx.lineTo(toX(n - 1), pad.top + plotH);
  ctx.closePath();
  ctx.fill();

  const drawLine = (data, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < data.length; i++) { const x = toX(i), y = toY(data[i]); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
  };
  drawLine(fitnessHistory.avg, '#f59e0b');
  drawLine(fitnessHistory.best, '#3b82f6');

  // Legend
  const ly = pad.top + 4;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#3b82f6'; ctx.fillRect(pad.left + 4, ly, 10, 3);
  ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'left'; ctx.fillText('Best', pad.left + 18, ly + 5);
  ctx.fillStyle = '#f59e0b'; ctx.fillRect(pad.left + 52, ly, 10, 3);
  ctx.fillStyle = '#94a3b8'; ctx.fillText('Avg', pad.left + 66, ly + 5);
}

// ─── Neural network diagram ───

function drawNNDiagram() {
  const canvas = el.nnDiagram;
  if (!canvas || !world) return;
  const { w: W, h: H, ctx } = sizeCanvasForHiDPI(canvas);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(0, 0, W, H);

  const best = world.getBestCreature();
  if (!best?.brain) {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No creature', W / 2, H / 2);
    return;
  }

  const nn = best.brain;
  const layers = nn.layers;
  const layerCount = layers.length;
  const padL = 50, padR = 36, padY = 22;
  const layerSpacing = (W - padL - padR) / (layerCount - 1);
  const maxNeurons = 12;
  const nodeRadius = Math.min(7, H / 30);

  const inputLabels = ['sin(a)', 'cos(a)', 'food', 'wallX', 'wallY', 'speed'];
  const outputLabels = ['rot', 'spd'];

  const positions = [];
  for (let l = 0; l < layerCount; l++) {
    const count = Math.min(layers[l].neurons.length, maxNeurons);
    const truncated = layers[l].neurons.length > maxNeurons;
    const x = padL + l * layerSpacing;
    const slots = count + (truncated ? 1 : 0);
    const yStep = (H - padY * 2) / Math.max(1, slots);
    const layerPos = [];

    for (let n = 0; n < count; n++) {
      layerPos.push({ x, y: padY + yStep * (n + 0.5), neuronIdx: n });
    }
    if (truncated) {
      layerPos.push({ x, y: padY + yStep * (count + 0.5), neuronIdx: -1, isEllipsis: true });
    }
    positions.push(layerPos);
  }

  // Connections
  for (let l = 1; l < layerCount; l++) {
    const prev = positions[l - 1].filter(p => !p.isEllipsis);
    const curr = positions[l].filter(p => !p.isEllipsis);
    for (const cn of curr) {
      const neuron = layers[l].neurons[cn.neuronIdx];
      for (const pn of prev) {
        if (pn.neuronIdx >= neuron.dendrites.length) continue;
        const w = neuron.dendrites[pn.neuronIdx].weight;
        const absW = Math.min(Math.abs(w), 2);
        const alpha = 0.12 + (absW / 2) * 0.55;
        ctx.strokeStyle = w > 0 ? `rgba(59,130,246,${alpha})` : `rgba(239,68,68,${alpha})`;
        ctx.lineWidth = 0.4 + (absW / 2) * 1.8;
        ctx.beginPath(); ctx.moveTo(pn.x, pn.y); ctx.lineTo(cn.x, cn.y); ctx.stroke();
      }
    }
  }

  // Nodes + labels
  for (let l = 0; l < layerCount; l++) {
    for (const p of positions[l]) {
      if (p.isEllipsis) {
        ctx.fillStyle = '#64748b'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('\u2026', p.x, p.y + 4);
        continue;
      }

      const val = layers[l].neurons[p.neuronIdx].value;
      const t = (Math.tanh(val) + 1) / 2;
      ctx.fillStyle = `rgb(${Math.round(30 + t * 180)},${Math.round(40 + (1 - t) * 100)},${Math.round(80 + (1 - t) * 150)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, nodeRadius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1; ctx.stroke();

      const fontSize = Math.max(8, Math.min(10, H / 22));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = '#94a3b8';

      if (l === 0 && p.neuronIdx < inputLabels.length) {
        ctx.textAlign = 'right';
        ctx.fillText(inputLabels[p.neuronIdx], p.x - nodeRadius - 4, p.y + fontSize / 3);
      }
      if (l === layerCount - 1 && p.neuronIdx < outputLabels.length) {
        ctx.textAlign = 'left';
        ctx.fillText(outputLabels[p.neuronIdx], p.x + nodeRadius + 4, p.y + fontSize / 3);
      }
    }
  }

  // Layer footers
  const footFontSize = Math.max(8, Math.min(9, H / 24));
  ctx.fillStyle = '#475569'; ctx.font = `${footFontSize}px sans-serif`; ctx.textAlign = 'center';
  const layerNames = ['Input', 'Hidden', 'Output'];
  for (let l = 0; l < layerCount; l++) {
    ctx.fillText(`${layerNames[l] || ''} (${layers[l].neurons.length})`, padL + l * layerSpacing, H - 4);
  }
}

// ─── Progress bar ───

function updateProgressBar() {
  if (!world || !el.generationProgress) return;
  const pct = world.getGenerationProgress() * 100;
  el.generationProgress.style.width = pct + '%';
  if (el.progressLabel) {
    el.progressLabel.textContent = `Gen ${world.stats.generation} — ${Math.round(pct)}%`;
  }
}

// ─── UI updates ───

function updateUI() {
  el.generation.textContent = world.stats.generation;
  el.aliveCount.textContent = world.stats.aliveCount;
  el.deadCount.textContent = world.stats.deadCount;
  el.currentTick.textContent = world.currentTick;
  el.avgFitness.textContent = world.stats.averageFitness.toFixed(1);
  el.bestFitness.textContent = world.stats.highestFitness.toFixed(1);
  el.foodEaten.textContent = world.currentGenerationFoodEaten;
  el.totalTime.textContent = world.stats.totalTime.toFixed(1) + 's';

  updateProgressBar();

  const currentGenCount = world.getGenerationHistory().length;
  if (currentGenCount !== lastGenerationCount) {
    updateGenerationTable();

    if (currentGenCount > 0) {
      const latest = world.getGenerationHistory()[0];
      fitnessHistory.avg.push(latest.averageFitness);
      fitnessHistory.best.push(latest.bestFitness);
    }

    drawFitnessChart();
    lastGenerationCount = currentGenCount;
  }

  drawNNDiagram();
}

function updateGenerationTable() {
  if (!world) return;
  const history = world.getGenerationHistory();
  const tbody = el.generationTableBody;
  if (!tbody) return;

  tbody.innerHTML = '';

  if (history.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 7;
    cell.className = 'table-empty';
    cell.textContent = 'Waiting for first generation...';
    return;
  }

  for (const gen of history) {
    const row = tbody.insertRow();
    row.insertCell().textContent = gen.generation;
    row.insertCell().textContent = gen.duration.toFixed(1) + 's';
    row.insertCell().textContent = `${gen.survivors}/${gen.totalCreatures}`;
    row.insertCell().textContent = gen.averageFitness.toFixed(1);
    row.insertCell().textContent = gen.bestFitness.toFixed(1);
    row.insertCell().textContent = gen.foodEaten;
    row.insertCell().textContent = gen.timestamp.toLocaleTimeString();
  }
}

// ─── Vector visualizations ───

function updateVectors() {
  targetVectorLines.forEach(l => l.visible = false);
  velocityVectorLines.forEach(l => l.visible = false);
  antennaVectorLines.forEach(l => l.visible = false);
  rotationVectorLines.forEach(l => l.visible = false);

  if (!world?.creatures) return;

  let ti = 0, vi = 0, ai = 0, ri = 0;

  for (const creature of world.creatures) {
    if (creature.isDead() || !creature.mesh) continue;
    const pos = creature.position;

    if (showTargetVectors && ti < targetVectorLines.length) {
      const food = creature.getClosestFood(world.foodSupply);
      if (food) {
        const line = targetVectorLines[ti++];
        const p = line.geometry.attributes.position.array;
        p[0] = pos.x; p[1] = pos.y; p[2] = 0;
        p[3] = food.position.x; p[4] = food.position.y; p[5] = 0;
        line.geometry.attributes.position.needsUpdate = true;
        line.visible = true;
      }
    }

    if (showVelocityVectors && vi < velocityVectorLines.length) {
      const line = velocityVectorLines[vi++];
      const p = line.geometry.attributes.position.array;
      const rad = (creature.angle + 90) * Math.PI / 180;
      // Scale to a reasonable visual length (2 units at max speed)
      const maxSpd = creature.maxSpeed || 8;
      const len = ((creature.speed || 0) / maxSpd) * 2;
      p[0] = pos.x; p[1] = pos.y; p[2] = 0;
      p[3] = pos.x + Math.cos(rad) * len; p[4] = pos.y + Math.sin(rad) * len; p[5] = 0;
      line.geometry.attributes.position.needsUpdate = true;
      line.visible = true;
    }

    if (showAntennaVectors && ai + 3 < antennaVectorLines.length) {
      const left = creature.leftSensorPos;
      const right = creature.rightSensorPos;
      const food = creature.getClosestFood(world.foodSupply);

      if (left && right && food) {
        const setLine = (line, x1, y1, x2, y2) => {
          const p = line.geometry.attributes.position.array;
          p[0] = x1; p[1] = y1; p[2] = 0.05;
          p[3] = x2; p[4] = y2; p[5] = 0.05;
          line.geometry.attributes.position.needsUpdate = true;
          line.visible = true;
        };
        setLine(antennaVectorLines[ai++], pos.x, pos.y, left.x, left.y);
        setLine(antennaVectorLines[ai++], pos.x, pos.y, right.x, right.y);
        setLine(antennaVectorLines[ai++], left.x, left.y, food.position.x, food.position.y);
        setLine(antennaVectorLines[ai++], right.x, right.y, food.position.x, food.position.y);
      }
    }

    if (showRotationVectors && ri < rotationVectorLines.length) {
      const rate = creature.rotationRate || 0;
      if (Math.abs(rate) > 0.5) {
        const line = rotationVectorLines[ri++];
        const p = line.geometry.attributes.position.array;
        const fwd = creature.angle + 90;
        const arcR = 0.6;
        // Show arc proportional to fraction of max rotation (90 deg arc = max)
        const maxRot = creature.maxRotation || 240;
        const fraction = Math.min(Math.abs(rate) / maxRot, 1);
        const span = fraction * 90;
        const segs = 9;
        for (let s = 0; s <= segs; s++) {
          const t = s / segs;
          const deg = fwd + t * Math.sign(rate) * span;
          const r = deg * Math.PI / 180;
          p[s * 3] = pos.x + Math.cos(r) * arcR;
          p[s * 3 + 1] = pos.y + Math.sin(r) * arcR;
          p[s * 3 + 2] = 0.02;
        }
        line.geometry.attributes.position.needsUpdate = true;
        line.geometry.setDrawRange(0, segs + 1);
        line.visible = true;
      }
    }
  }
}

// ─── Animation loop ───

function animate(currentTime) {
  requestAnimationFrame(animate);

  const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0;
  lastTime = currentTime;
  const clampedDelta = Math.min(deltaTime, 0.1);

  if (world) {
    world.update(clampedDelta);

    if (world.needsMeshUpdate) {
      createCreatureMeshes();
      world.needsMeshUpdate = false;
    }

    updateCreatureColors();
    updateVectors();
    updateUI();
  }

  renderer.render(scene, camera);
}

// ─── Event listeners ───

function setupEventListeners() {
  el.pauseBtn.addEventListener('click', () => {
    world.togglePause();
    el.pauseBtn.textContent = world.isPaused ? 'Resume' : 'Pause';
  });

  el.restartBtn.addEventListener('click', () => {
    world.restart();
    fitnessHistory = { avg: [], best: [] };
    lastGenerationCount = 0;
    updateCamera();
    updateWorldGeometry();
    createCreatureMeshes();
    createFoodMeshes();
    drawFitnessChart();
  });

  el.cloneBtn.addEventListener('click', () => {
    const best = world.getBestCreature();
    if (best) {
      const cloned = world.cloneGeneration();
      world = cloned;
      createCreatureMeshes();
      createFoodMeshes();
    }
  });

  el.applyBtn.addEventListener('click', () => {
    const worldSize = parseInt(el.worldSizeSlider.value);
    const half = worldSize / 2;
    world.updateConfig({
      initialPopulation: parseInt(el.populationSlider.value),
      initialFoodSupply: parseInt(el.foodSlider.value),
      ticksPerGeneration: parseInt(el.ticksSlider.value),
      hiddenLayerCount: parseInt(el.hiddenLayerSlider.value),
      crossoverRate: parseFloat(el.crossoverSlider.value),
      mutationRate: parseFloat(el.mutationSlider.value),
      minSpeed: parseFloat(el.minSpeedSlider.value),
      maxSpeed: parseFloat(el.maxSpeedSlider.value),
      minRotation: parseFloat(el.minRotationSlider.value),
      maxRotation: parseFloat(el.maxRotationSlider.value),
      worldSize,
      bounds: { min: { x: -half, y: -half }, max: { x: half, y: half } }
    });
    world.restart();
    fitnessHistory = { avg: [], best: [] };
    lastGenerationCount = 0;
    updateCamera();
    updateWorldGeometry();
    createCreatureMeshes();
    createFoodMeshes();
    drawFitnessChart();
  });

  el.speedSlider.addEventListener('input', e => {
    const speed = parseFloat(e.target.value);
    el.speedValue.textContent = speed.toFixed(1);
    world.setSpeed(speed);
  });

  const sliderPairs = [
    ['populationSlider', 'populationValue'],
    ['foodSlider', 'foodValue'],
    ['ticksSlider', 'ticksValue'],
    ['hiddenLayerSlider', 'hiddenLayerValue'],
    ['mutationSlider', 'mutationValue'],
    ['crossoverSlider', 'crossoverValue'],
    ['worldSizeSlider', 'worldSizeValue'],
    ['minSpeedSlider', 'minSpeedValue'],
    ['maxSpeedSlider', 'maxSpeedValue'],
    ['minRotationSlider', 'minRotationValue'],
    ['maxRotationSlider', 'maxRotationValue']
  ];
  for (const [slider, display] of sliderPairs) {
    el[slider].addEventListener('input', e => { el[display].textContent = e.target.value; });
  }

  document.getElementById('showTargetVectors').addEventListener('change', e => showTargetVectors = e.target.checked);
  document.getElementById('showVelocityVectors').addEventListener('change', e => showVelocityVectors = e.target.checked);
  document.getElementById('showAntennaVectors').addEventListener('change', e => showAntennaVectors = e.target.checked);
  document.getElementById('showRotationVectors').addEventListener('change', e => showRotationVectors = e.target.checked);
}

// ─── Init ───

function init() {
  bindElements();
  initThreeJS();
  initWorld();
  setupEventListeners();
  animate(0);

  setTimeout(() => {
    const overlay = document.getElementById('loading');
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => overlay.style.display = 'none', 500);
    }
  }, 400);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

import { World, Phase } from './World.js';

let scene, camera, renderer;
let world;
let creatureMeshes = [];
let foodMeshes = [];
let particleGroups = [];
let lastTime = 0;
let lastIterationCount = 0;
let showTargetVectors = false;
let showAntennaVectors = false;
let showAttention = false;
let targetVectorLines = [];
let antennaVectorLines = [];

// Chart contexts
let lossChartCtx, foodChartCtx;

const el = {
  pauseBtn: null, restartBtn: null, applyBtn: null,
  speedSlider: null, speedValue: null,
  worldSizeSlider: null, worldSizeValue: null,
  populationSlider: null, populationValue: null,
  foodSlider: null, foodValue: null,
  durationSlider: null, durationValue: null,
  trainingStepsSlider: null, trainingStepsValue: null,
  learningRateSlider: null, learningRateValue: null,
  temperatureSlider: null, temperatureValue: null,
  topKSlider: null, topKValue: null,
  iteration: null, phaseIndicator: null, aliveCount: null, deadCount: null,
  foodEaten: null, avgReward: null, bestReward: null,
  trainingLoss: null, totalTime: null, paramCount: null,
  trainingProgress: null, trainingProgressBar: null,
  iterationTableBody: null,
  showTargetVectors: null, showAttention: null
};

function bindElements() {
  for (const key of Object.keys(el)) {
    el[key] = document.getElementById(key);
  }
}

function initThreeJS() {
  const canvas = document.getElementById('simulationCanvas');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const aspect = canvas.clientWidth / canvas.clientHeight;
  const viewSize = 22; // default for 40x40 world
  camera = new THREE.OrthographicCamera(
    -viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 1000
  );
  camera.position.z = 10;

  renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, powerPreference: 'high-performance', alpha: false
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight.position.set(5, 5, 10);
  scene.add(dirLight);

  const grid = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
  grid.name = 'worldGrid';
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  const boundaryGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(40, 40));
  const boundaryMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
  const boundary = new THREE.LineSegments(boundaryGeo, boundaryMat);
  boundary.name = 'worldBoundary';
  scene.add(boundary);

  initVectorLines();
  window.addEventListener('resize', onWindowResize);
}

function initVectorLines() {
  for (let i = 0; i < 200; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff0000 }));
    line.visible = false;
    scene.add(line);
    targetVectorLines.push(line);
  }
  
  // 4 lines per creature: 2 antenna segments + 2 tip-to-food lines
  for (let i = 0; i < 800; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const color = i % 4 < 2 ? 0xffaa00 : 0xffdd44;
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
    line.visible = false;
    scene.add(line);
    antennaVectorLines.push(line);
  }
}

function onWindowResize() {
  const canvas = document.getElementById('simulationCanvas');
  const aspect = canvas.clientWidth / canvas.clientHeight;
  const worldSize = world ? (world.config.bounds.max.x - world.config.bounds.min.x) : 40;
  const viewSize = worldSize / 2 + 2;
  camera.left = -viewSize * aspect;
  camera.right = viewSize * aspect;
  camera.top = viewSize;
  camera.bottom = -viewSize;
  camera.updateProjectionMatrix();
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

function createCreatureMeshes() {
  const currentCreatures = new Set(world.creatures);
  const toRemove = [];
  for (let i = creatureMeshes.length - 1; i >= 0; i--) {
    const mesh = creatureMeshes[i];
    const found = world.creatures.find(c => c.mesh === mesh);
    if (!found || !currentCreatures.has(found)) {
      scene.remove(mesh);
      toRemove.push(i);
    }
  }
  for (const idx of toRemove) creatureMeshes.splice(idx, 1);

  for (const creature of world.creatures) {
    if (!creature.mesh || !creature.mesh.parent) {
      const group = new THREE.Group();

      // Body
      const bodyGeo = new THREE.CircleGeometry(0.25, 16);
      const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff6b6b, emissive: 0x330000 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.scale.set(1, 1.3, 1);
      group.add(body);

      // Head
      const headGeo = new THREE.CircleGeometry(0.15, 16);
      const headMat = new THREE.MeshPhongMaterial({ color: 0xff8888, emissive: 0x440000 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, 0.3, 0.01);
      group.add(head);

      // Eyes
      const eyeGeo = new THREE.CircleGeometry(0.05, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lEye = new THREE.Mesh(eyeGeo, eyeMat);
      lEye.position.set(-0.06, 0.32, 0.02);
      group.add(lEye);
      const rEye = new THREE.Mesh(eyeGeo, eyeMat);
      rEye.position.set(0.06, 0.32, 0.02);
      group.add(rEye);

      // Antennae (±25° from forward)
      const antGeo = new THREE.BufferGeometry();
      antGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        -0.04, 0.4, 0,
        -0.04 - Math.sin(25 * Math.PI / 180) * 0.15, 0.4 + Math.cos(25 * Math.PI / 180) * 0.15, 0,
        0.04, 0.4, 0,
        0.04 + Math.sin(25 * Math.PI / 180) * 0.15, 0.4 + Math.cos(25 * Math.PI / 180) * 0.15, 0
      ]), 3));
      group.add(new THREE.LineSegments(antGeo, new THREE.LineBasicMaterial({ color: 0x884444 })));

      // Wings
      const wingGeo = new THREE.CircleGeometry(0.15, 12);
      const wingMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.3 });
      const lWing = new THREE.Mesh(wingGeo, wingMat);
      lWing.position.set(-0.25, 0, -0.01);
      lWing.scale.set(1.2, 0.8, 1);
      group.add(lWing);
      const rWing = new THREE.Mesh(wingGeo, wingMat.clone());
      rWing.position.set(0.25, 0, -0.01);
      rWing.scale.set(1.2, 0.8, 1);
      group.add(rWing);

      scene.add(group);
      creature.setMesh(group);
      creatureMeshes.push(group);
    }
  }
}

function createFoodMeshes() {
  foodMeshes.forEach(m => scene.remove(m));
  foodMeshes = [];
  for (const food of world.foodItems) {
    const geo = new THREE.CircleGeometry(0.2, 16);
    const mat = new THREE.MeshPhongMaterial({ color: 0x51cf66, emissive: 0x003300 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    food.setMesh(mesh);
    foodMeshes.push(mesh);
  }
}

// --- Particle effects ---

function spawnParticle(x, y) {
  const count = 6;
  const group = { meshes: [], velocities: [], life: 0.5 };
  for (let i = 0; i < count; i++) {
    const geo = new THREE.CircleGeometry(0.06, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.3 + Math.random() * 0.15, 0.9, 0.6),
      transparent: true, opacity: 1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, 0.1);
    scene.add(mesh);
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    group.meshes.push(mesh);
    group.velocities.push({ x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
  }
  particleGroups.push(group);
}

function updateParticles(dt) {
  for (let i = particleGroups.length - 1; i >= 0; i--) {
    const pg = particleGroups[i];
    pg.life -= dt;
    if (pg.life <= 0) {
      pg.meshes.forEach(m => scene.remove(m));
      particleGroups.splice(i, 1);
      continue;
    }
    for (let j = 0; j < pg.meshes.length; j++) {
      const m = pg.meshes[j];
      const v = pg.velocities[j];
      m.position.x += v.x * dt;
      m.position.y += v.y * dt;
      m.material.opacity = pg.life / 0.5;
      m.scale.setScalar(pg.life / 0.5);
    }
  }
}

// Track food positions to detect collection
let prevFoodPositions = [];

function checkFoodCollection() {
  if (!world || !world.foodItems) return;
  for (let i = 0; i < world.foodItems.length; i++) {
    const food = world.foodItems[i];
    const prev = prevFoodPositions[i];
    if (prev && (prev.x !== food.position.x || prev.y !== food.position.y)) {
      spawnParticle(prev.x, prev.y);
    }
  }
  prevFoodPositions = world.foodItems.map(f => ({ x: f.position.x, y: f.position.y }));
}

// --- Charts ---

function drawLossChart() {
  if (!lossChartCtx || world.lossHistory.length === 0) return;
  const ctx = lossChartCtx;
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const data = world.lossHistory;
  const maxVal = Math.max(...data, 0.1);
  const minVal = Math.min(...data, 0);

  // Background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = (h / 5) * i + 20;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
  }

  // Title
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillText('Training Loss', 40, 14);

  // Y-axis labels
  ctx.fillStyle = '#64748b';
  ctx.font = '9px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) {
    const y = 20 + (h - 30) * i / 4;
    const val = maxVal - (maxVal - minVal) * i / 4;
    ctx.fillText(val.toFixed(2), 36, y + 3);
  }
  ctx.textAlign = 'left';

  if (data.length < 2) return;

  // Line
  const gradient = ctx.createLinearGradient(0, 20, 0, h - 10);
  gradient.addColorStop(0, '#3b82f6');
  gradient.addColorStop(1, '#818cf8');

  ctx.beginPath();
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  for (let i = 0; i < data.length; i++) {
    const x = 40 + (w - 50) * i / (data.length - 1);
    const y = 20 + (h - 30) * (1 - (data[i] - minVal) / (maxVal - minVal || 1));
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Fill under curve
  ctx.lineTo(40 + (w - 50), h - 10);
  ctx.lineTo(40, h - 10);
  ctx.closePath();
  const fillGrad = ctx.createLinearGradient(0, 20, 0, h - 10);
  fillGrad.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
  fillGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = fillGrad;
  ctx.fill();
}

function drawFoodChart() {
  if (!foodChartCtx || world.foodPerIteration.length === 0) return;
  const ctx = foodChartCtx;
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const data = world.foodPerIteration;
  const maxVal = Math.max(...data, 1);

  // Background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillText('Food per Iteration', 40, 14);

  // Y-axis labels
  ctx.fillStyle = '#64748b';
  ctx.font = '9px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) {
    const y = 20 + (h - 30) * i / 4;
    const val = maxVal - maxVal * i / 4;
    ctx.fillText(Math.round(val).toString(), 36, y + 3);
  }
  ctx.textAlign = 'left';

  // Bars
  const barAreaW = w - 50;
  const maxBars = 40;
  const displayData = data.slice(-maxBars);
  const barW = Math.max(2, barAreaW / displayData.length - 1);

  for (let i = 0; i < displayData.length; i++) {
    const barH = (h - 30) * displayData[i] / maxVal;
    const x = 40 + (barAreaW / displayData.length) * i;
    const y = h - 10 - barH;

    const hue = 0.3 + 0.15 * (displayData[i] / maxVal);
    ctx.fillStyle = `hsla(${hue * 360}, 80%, 50%, 0.8)`;
    ctx.fillRect(x, y, barW, barH);
  }
}

function updateVectors() {
  targetVectorLines.forEach(l => l.visible = false);
  antennaVectorLines.forEach(l => l.visible = false);
  if (!world || !world.creatures) return;

  let idx = 0;
  let antIdx = 0;
  for (const creature of world.creatures) {
    if (creature.isDead() || !creature.mesh) continue;

    const cPos = creature.position;

    if (showTargetVectors && idx < targetVectorLines.length) {
      const closestFood = creature._getClosestFood(world.foodItems);
      if (closestFood) {
        const line = targetVectorLines[idx++];
        const pos = line.geometry.attributes.position.array;
        pos[0] = cPos.x; pos[1] = cPos.y; pos[2] = 0;
        pos[3] = closestFood.position.x; pos[4] = closestFood.position.y; pos[5] = 0;
        line.geometry.attributes.position.needsUpdate = true;
        line.visible = true;
      }
    }

    if (showAntennaVectors && antIdx + 3 < antennaVectorLines.length) {
      const left = creature.leftSensorPos;
      const right = creature.rightSensorPos;
      const closestFood = creature._getClosestFood(world.foodItems);

      if (left && right && closestFood) {
        const l0 = antennaVectorLines[antIdx++];
        const p0 = l0.geometry.attributes.position.array;
        p0[0] = cPos.x; p0[1] = cPos.y; p0[2] = 0.05;
        p0[3] = left.x; p0[4] = left.y; p0[5] = 0.05;
        l0.geometry.attributes.position.needsUpdate = true;
        l0.visible = true;

        const l1 = antennaVectorLines[antIdx++];
        const p1 = l1.geometry.attributes.position.array;
        p1[0] = cPos.x; p1[1] = cPos.y; p1[2] = 0.05;
        p1[3] = right.x; p1[4] = right.y; p1[5] = 0.05;
        l1.geometry.attributes.position.needsUpdate = true;
        l1.visible = true;

        const l2 = antennaVectorLines[antIdx++];
        const p2 = l2.geometry.attributes.position.array;
        p2[0] = left.x; p2[1] = left.y; p2[2] = 0.05;
        p2[3] = closestFood.position.x; p2[4] = closestFood.position.y; p2[5] = 0.05;
        l2.geometry.attributes.position.needsUpdate = true;
        l2.visible = true;

        const l3 = antennaVectorLines[antIdx++];
        const p3 = l3.geometry.attributes.position.array;
        p3[0] = right.x; p3[1] = right.y; p3[2] = 0.05;
        p3[3] = closestFood.position.x; p3[4] = closestFood.position.y; p3[5] = 0.05;
        l3.geometry.attributes.position.needsUpdate = true;
        l3.visible = true;
      }
    }
  }
}

function boundsFromSize(size) {
  const half = size / 2;
  return { min: { x: -half, y: -half }, max: { x: half, y: half } };
}

function rebuildWorldGeometry(size) {
  const oldGrid = scene.getObjectByName('worldGrid');
  if (oldGrid) scene.remove(oldGrid);
  const oldBoundary = scene.getObjectByName('worldBoundary');
  if (oldBoundary) scene.remove(oldBoundary);

  const grid = new THREE.GridHelper(size, size, 0x444444, 0x222222);
  grid.name = 'worldGrid';
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  const boundaryGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(size, size));
  const boundaryMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
  const boundary = new THREE.LineSegments(boundaryGeo, boundaryMat);
  boundary.name = 'worldBoundary';
  scene.add(boundary);

  const viewSize = size / 2 + 2;
  const canvas = document.getElementById('simulationCanvas');
  const aspect = canvas.clientWidth / canvas.clientHeight;
  camera.left = -viewSize * aspect;
  camera.right = viewSize * aspect;
  camera.top = viewSize;
  camera.bottom = -viewSize;
  camera.updateProjectionMatrix();
}

function initWorld() {
  const worldSize = parseInt(el.worldSizeSlider.value);
  const config = {
    population: parseInt(el.populationSlider.value),
    foodSupply: parseInt(el.foodSlider.value),
    episodeDuration: parseInt(el.durationSlider.value),
    trainingSteps: parseInt(el.trainingStepsSlider.value),
    learningRate: parseFloat(el.learningRateSlider.value),
    temperature: parseFloat(el.temperatureSlider.value),
    topKPercent: parseInt(el.topKSlider.value),
    speed: parseFloat(el.speedSlider.value),
    bounds: boundsFromSize(worldSize)
  };
  world = new World(config);
  world.init();
  rebuildWorldGeometry(worldSize);
  prevFoodPositions = world.foodItems.map(f => ({ x: f.position.x, y: f.position.y }));
  createCreatureMeshes();
  createFoodMeshes();
}

function updateUI() {
  if (!world) return;
  el.iteration.textContent = world.stats.iteration;
  el.aliveCount.textContent = world.stats.aliveCount;
  el.deadCount.textContent = world.stats.deadCount;
  el.foodEaten.textContent = world.stats.totalFoodEaten;
  el.avgReward.textContent = world.stats.avgReward.toFixed(1);
  el.bestReward.textContent = world.stats.bestReward.toFixed(1);
  el.trainingLoss.textContent = world.stats.trainingLoss.toFixed(4);
  el.totalTime.textContent = world.stats.totalTime.toFixed(1) + 's';
  el.paramCount.textContent = world.stats.paramCount.toLocaleString();

  // Phase indicator
  const phaseEl = el.phaseIndicator;
  if (phaseEl) {
    phaseEl.textContent = world.phase;
    phaseEl.className = 'phase-badge phase-' + world.phase.toLowerCase();
  }

  // Training progress bar
  if (world.phase === Phase.TRAINING) {
    if (el.trainingProgress) {
      el.trainingProgress.textContent = `${world.currentTrainingStep}/${world.config.trainingSteps}`;
    }
    if (el.trainingProgressBar) {
      el.trainingProgressBar.style.width = `${world.trainingProgress * 100}%`;
    }
  } else {
    if (el.trainingProgress) el.trainingProgress.textContent = '-';
    if (el.trainingProgressBar) el.trainingProgressBar.style.width = '0%';
  }

  // Update iteration history table
  const currentCount = world.getIterationHistory().length;
  if (currentCount !== lastIterationCount) {
    updateIterationTable();
    lastIterationCount = currentCount;
  }
}

function updateIterationTable() {
  if (!world) return;
  const history = world.getIterationHistory();
  const tbody = el.iterationTableBody;
  if (!tbody) return;

  tbody.innerHTML = '';
  if (history.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.className = 'table-empty';
    cell.textContent = 'Waiting for first iteration...';
    return;
  }

  for (const entry of history) {
    const row = tbody.insertRow();
    row.insertCell().textContent = entry.iteration;
    row.insertCell().textContent = entry.foodEaten;
    row.insertCell().textContent = entry.avgReward.toFixed(1);
    row.insertCell().textContent = entry.bestReward.toFixed(1);
    row.insertCell().textContent = `${entry.aliveAtEnd}/${entry.totalCreatures}`;
    row.insertCell().textContent = entry.timestamp.toLocaleTimeString();
  }
}

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

    if (world.phase === Phase.SIMULATING) {
      checkFoodCollection();
    }

    updateParticles(clampedDelta);
    updateVectors();
    updateUI();
    drawLossChart();
    drawFoodChart();
  }

  renderer.render(scene, camera);
}

function setupEventListeners() {
  el.pauseBtn.addEventListener('click', () => {
    world.togglePause();
    el.pauseBtn.textContent = world.isPaused ? 'Resume' : 'Pause';
  });

  el.restartBtn.addEventListener('click', () => {
    world.restart();
    createCreatureMeshes();
    createFoodMeshes();
    prevFoodPositions = world.foodItems.map(f => ({ x: f.position.x, y: f.position.y }));
  });

  el.applyBtn.addEventListener('click', () => {
    const worldSize = parseInt(el.worldSizeSlider.value);
    world.updateConfig({
      population: parseInt(el.populationSlider.value),
      foodSupply: parseInt(el.foodSlider.value),
      episodeDuration: parseInt(el.durationSlider.value),
      trainingSteps: parseInt(el.trainingStepsSlider.value),
      learningRate: parseFloat(el.learningRateSlider.value),
      temperature: parseFloat(el.temperatureSlider.value),
      topKPercent: parseInt(el.topKSlider.value),
      bounds: boundsFromSize(worldSize)
    });
    world.restart();
    rebuildWorldGeometry(worldSize);
    createCreatureMeshes();
    createFoodMeshes();
    prevFoodPositions = world.foodItems.map(f => ({ x: f.position.x, y: f.position.y }));
  });

  el.speedSlider.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    el.speedValue.textContent = v.toFixed(1);
    world.setSpeed(v);
  });

  const sliderBindings = [
    ['worldSizeSlider', 'worldSizeValue'],
    ['populationSlider', 'populationValue'],
    ['foodSlider', 'foodValue'],
    ['durationSlider', 'durationValue'],
    ['trainingStepsSlider', 'trainingStepsValue'],
    ['topKSlider', 'topKValue'],
  ];
  for (const [slider, display] of sliderBindings) {
    el[slider].addEventListener('input', e => {
      el[display].textContent = e.target.value;
    });
  }

  el.learningRateSlider.addEventListener('input', e => {
    el.learningRateValue.textContent = parseFloat(e.target.value).toFixed(4);
  });

  el.temperatureSlider.addEventListener('input', e => {
    el.temperatureValue.textContent = parseFloat(e.target.value).toFixed(2);
  });

  document.getElementById('showTargetVectors').addEventListener('change', e => {
    showTargetVectors = e.target.checked;
  });

  document.getElementById('showAntennaVectors').addEventListener('change', e => {
    showAntennaVectors = e.target.checked;
  });

  document.getElementById('showAttention').addEventListener('change', e => {
    showAttention = e.target.checked;
  });
}

function init() {
  bindElements();

  // Chart canvases
  const lossCanvas = document.getElementById('lossChart');
  const foodCanvas = document.getElementById('foodChart');
  if (lossCanvas) {
    lossCanvas.width = lossCanvas.clientWidth * 2;
    lossCanvas.height = lossCanvas.clientHeight * 2;
    lossChartCtx = lossCanvas.getContext('2d');
  }
  if (foodCanvas) {
    foodCanvas.width = foodCanvas.clientWidth * 2;
    foodCanvas.height = foodCanvas.clientHeight * 2;
    foodChartCtx = foodCanvas.getContext('2d');
  }

  initThreeJS();
  initWorld();
  setupEventListeners();
  animate(0);

  setTimeout(() => {
    const loadingOverlay = document.getElementById('loading');
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
      setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);
    }
  }, 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

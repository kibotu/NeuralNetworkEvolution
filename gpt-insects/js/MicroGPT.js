import { Value } from './Value.js';

/**
 * Micro GPT transformer - port of Karpathy's gpt.py.
 * Supports dual-mode: fast inference with plain numbers, and training with Value autograd.
 *
 * Architecture: GPT-2 variant with RMSNorm, ReLU^2, no biases.
 */

const N_EMBD = 16;
const N_HEAD = 4;
const N_LAYER = 1;
const BLOCK_SIZE = 16;
const HEAD_DIM = N_EMBD / N_HEAD;

function gaussRandom(std = 0.02) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class MicroGPT {
  constructor(vocabSize) {
    this.vocabSize = vocabSize;
    this.nEmbd = N_EMBD;
    this.nHead = N_HEAD;
    this.nLayer = N_LAYER;
    this.blockSize = BLOCK_SIZE;
    this.headDim = HEAD_DIM;

    this.stateDict = {};
    this._initWeights();
    this.params = this._flattenParams();

    // Adam optimizer state
    this.m = new Float64Array(this.params.length);
    this.v = new Float64Array(this.params.length);
    this.step = 0;
  }

  _matrix(nout, nin, std = 0.02) {
    const mat = [];
    for (let i = 0; i < nout; i++) {
      const row = [];
      for (let j = 0; j < nin; j++) {
        row.push(new Value(gaussRandom(std)));
      }
      mat.push(row);
    }
    return mat;
  }

  _initWeights() {
    const sd = this.stateDict;
    sd.wte = this._matrix(this.vocabSize, N_EMBD);
    sd.wpe = this._matrix(BLOCK_SIZE, N_EMBD);
    sd.lm_head = this._matrix(this.vocabSize, N_EMBD);

    for (let i = 0; i < N_LAYER; i++) {
      sd[`layer${i}.attn_wq`] = this._matrix(N_EMBD, N_EMBD);
      sd[`layer${i}.attn_wk`] = this._matrix(N_EMBD, N_EMBD);
      sd[`layer${i}.attn_wv`] = this._matrix(N_EMBD, N_EMBD);
      sd[`layer${i}.attn_wo`] = this._matrix(N_EMBD, N_EMBD, 0);
      sd[`layer${i}.mlp_fc1`] = this._matrix(4 * N_EMBD, N_EMBD);
      sd[`layer${i}.mlp_fc2`] = this._matrix(N_EMBD, 4 * N_EMBD, 0);
    }
  }

  _flattenParams() {
    const params = [];
    for (const key of Object.keys(this.stateDict)) {
      for (const row of this.stateDict[key]) {
        for (const p of row) {
          params.push(p);
        }
      }
    }
    return params;
  }

  // --- Training mode (uses Value objects, builds computation graph) ---

  _linearTrain(x, w) {
    return w.map(wo => {
      let sum = wo[0].mul(x[0]);
      for (let i = 1; i < wo.length; i++) {
        sum = sum.add(wo[i].mul(x[i]));
      }
      return sum;
    });
  }

  _softmaxTrain(logits) {
    let maxVal = -Infinity;
    for (const v of logits) {
      if (v.data > maxVal) maxVal = v.data;
    }
    const exps = logits.map(v => v.sub(maxVal).exp());
    let total = exps[0];
    for (let i = 1; i < exps.length; i++) {
      total = total.add(exps[i]);
    }
    return exps.map(e => e.div(total));
  }

  _rmsnormTrain(x) {
    let ms = x[0].mul(x[0]);
    for (let i = 1; i < x.length; i++) {
      ms = ms.add(x[i].mul(x[i]));
    }
    ms = ms.div(x.length);
    const scale = ms.add(1e-5).pow(-0.5);
    return x.map(xi => xi.mul(scale));
  }

  forwardTrain(tokenId, posId, keys, values) {
    const sd = this.stateDict;
    const tokEmb = sd.wte[tokenId];
    const posEmb = sd.wpe[posId];
    let x = tokEmb.map((t, i) => t.add(posEmb[i]));
    x = this._rmsnormTrain(x);

    for (let li = 0; li < N_LAYER; li++) {
      const xResidual = x;
      x = this._rmsnormTrain(x);
      const q = this._linearTrain(x, sd[`layer${li}.attn_wq`]);
      const k = this._linearTrain(x, sd[`layer${li}.attn_wk`]);
      const v = this._linearTrain(x, sd[`layer${li}.attn_wv`]);
      keys[li].push(k);
      values[li].push(v);

      const xAttn = [];
      for (let h = 0; h < N_HEAD; h++) {
        const hs = h * HEAD_DIM;
        const qH = q.slice(hs, hs + HEAD_DIM);
        const kH = keys[li].map(ki => ki.slice(hs, hs + HEAD_DIM));
        const vH = values[li].map(vi => vi.slice(hs, hs + HEAD_DIM));

        const attnLogits = kH.map(kht => {
          let s = qH[0].mul(kht[0]);
          for (let j = 1; j < HEAD_DIM; j++) {
            s = s.add(qH[j].mul(kht[j]));
          }
          return s.div(Math.sqrt(HEAD_DIM));
        });

        const attnWeights = this._softmaxTrain(attnLogits);
        for (let j = 0; j < HEAD_DIM; j++) {
          let headOut = attnWeights[0].mul(vH[0][j]);
          for (let t = 1; t < vH.length; t++) {
            headOut = headOut.add(attnWeights[t].mul(vH[t][j]));
          }
          xAttn.push(headOut);
        }
      }

      x = this._linearTrain(xAttn, sd[`layer${li}.attn_wo`]);
      x = x.map((a, i) => a.add(xResidual[i]));

      const xResidual2 = x;
      x = this._rmsnormTrain(x);
      x = this._linearTrain(x, sd[`layer${li}.mlp_fc1`]);
      x = x.map(xi => xi.relu().pow(2));
      x = this._linearTrain(x, sd[`layer${li}.mlp_fc2`]);
      x = x.map((a, i) => a.add(xResidual2[i]));
    }

    return this._linearTrain(x, sd.lm_head);
  }

  // --- Inference mode (plain numbers, no graph, fast) ---

  _getWeightData(key) {
    return this.stateDict[key].map(row => row.map(p => p.data));
  }

  _linearInfer(x, w) {
    return w.map(wo => {
      let sum = 0;
      for (let i = 0; i < wo.length; i++) sum += wo[i] * x[i];
      return sum;
    });
  }

  _softmaxInfer(logits) {
    let maxVal = -Infinity;
    for (const v of logits) if (v > maxVal) maxVal = v;
    const exps = logits.map(v => Math.exp(v - maxVal));
    const total = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / total);
  }

  _rmsnormInfer(x) {
    let ms = 0;
    for (const xi of x) ms += xi * xi;
    ms /= x.length;
    const scale = 1 / Math.sqrt(ms + 1e-5);
    return x.map(xi => xi * scale);
  }

  /**
   * Fast forward pass using plain numbers. Returns {logits, probs, attentionWeights}.
   * attentionWeights[layer][head] = array of weights for visualization.
   */
  forward(tokenId, posId, keys, values) {
    const wte = this._getWeightData('wte');
    const wpe = this._getWeightData('wpe');

    let x = wte[tokenId].map((t, i) => t + wpe[posId][i]);
    x = this._rmsnormInfer(x);

    const allAttnWeights = [];

    for (let li = 0; li < N_LAYER; li++) {
      const wq = this._getWeightData(`layer${li}.attn_wq`);
      const wk = this._getWeightData(`layer${li}.attn_wk`);
      const wv = this._getWeightData(`layer${li}.attn_wv`);
      const wo = this._getWeightData(`layer${li}.attn_wo`);
      const fc1 = this._getWeightData(`layer${li}.mlp_fc1`);
      const fc2 = this._getWeightData(`layer${li}.mlp_fc2`);

      const xResidual = x.slice();
      x = this._rmsnormInfer(x);
      const q = this._linearInfer(x, wq);
      const k = this._linearInfer(x, wk);
      const v = this._linearInfer(x, wv);
      keys[li].push(k);
      values[li].push(v);

      const xAttn = [];
      const layerAttn = [];

      for (let h = 0; h < N_HEAD; h++) {
        const hs = h * HEAD_DIM;
        const qH = q.slice(hs, hs + HEAD_DIM);
        const kH = keys[li].map(ki => ki.slice(hs, hs + HEAD_DIM));
        const vH = values[li].map(vi => vi.slice(hs, hs + HEAD_DIM));

        const attnLogits = kH.map(kht => {
          let s = 0;
          for (let j = 0; j < HEAD_DIM; j++) s += qH[j] * kht[j];
          return s / Math.sqrt(HEAD_DIM);
        });

        const attnWeights = this._softmaxInfer(attnLogits);
        layerAttn.push(attnWeights.slice());

        for (let j = 0; j < HEAD_DIM; j++) {
          let out = 0;
          for (let t = 0; t < vH.length; t++) out += attnWeights[t] * vH[t][j];
          xAttn.push(out);
        }
      }
      allAttnWeights.push(layerAttn);

      x = this._linearInfer(xAttn, wo);
      x = x.map((a, i) => a + xResidual[i]);

      const xResidual2 = x.slice();
      x = this._rmsnormInfer(x);
      x = this._linearInfer(x, fc1);
      x = x.map(xi => { const r = Math.max(0, xi); return r * r; }); // ReLU^2
      x = this._linearInfer(x, fc2);
      x = x.map((a, i) => a + xResidual2[i]);
    }

    const lmHead = this._getWeightData('lm_head');
    const logits = this._linearInfer(x, lmHead);
    const probs = this._softmaxInfer(logits);

    return { logits, probs, attentionWeights: allAttnWeights };
  }

  zeroGrad() {
    for (const p of this.params) p.grad = 0;
  }

  /**
   * Run one Adam optimizer step.
   */
  adamStep(learningRate = 0.01, beta1 = 0.9, beta2 = 0.95, eps = 1e-8) {
    this.step++;
    const lrT = learningRate * (1 - this.step / 10000);
    for (let i = 0; i < this.params.length; i++) {
      const p = this.params[i];
      this.m[i] = beta1 * this.m[i] + (1 - beta1) * p.grad;
      this.v[i] = beta2 * this.v[i] + (1 - beta2) * p.grad * p.grad;
      const mHat = this.m[i] / (1 - Math.pow(beta1, this.step));
      const vHat = this.v[i] / (1 - Math.pow(beta2, this.step));
      p.data -= lrT * mHat / (Math.sqrt(vHat) + eps);
      p.grad = 0;
    }
  }

  /**
   * Train on a single token sequence. Returns average loss.
   */
  trainOnSequence(tokens, learningRate = 0.01) {
    const n = Math.min(BLOCK_SIZE, tokens.length - 1);
    if (n <= 0) return 0;

    const keys = Array.from({ length: N_LAYER }, () => []);
    const vals = Array.from({ length: N_LAYER }, () => []);
    const losses = [];

    for (let pos = 0; pos < n; pos++) {
      const tokenId = tokens[pos];
      const targetId = tokens[pos + 1];
      const logits = this.forwardTrain(tokenId, pos, keys, vals);
      const probs = this._softmaxTrain(logits);
      const lossT = probs[targetId].log().mul(-1);
      losses.push(lossT);
    }

    let loss = losses[0];
    for (let i = 1; i < losses.length; i++) loss = loss.add(losses[i]);
    loss = loss.div(n);

    loss.backward();
    this.adamStep(learningRate);

    return loss.data;
  }

  getParamCount() {
    return this.params.length;
  }
}

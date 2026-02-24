/**
 * Scalar autograd engine - port of Karpathy's micrograd Value class.
 * Tracks computation graph and computes gradients via reverse-mode autodiff.
 */
export class Value {
  constructor(data, _children = [], _op = '') {
    this.data = data;
    this.grad = 0;
    this._backward = () => {};
    this._prev = new Set(_children);
    this._op = _op;
  }

  add(other) {
    other = other instanceof Value ? other : new Value(other);
    const out = new Value(this.data + other.data, [this, other], '+');
    out._backward = () => {
      this.grad += out.grad;
      other.grad += out.grad;
    };
    return out;
  }

  mul(other) {
    other = other instanceof Value ? other : new Value(other);
    const out = new Value(this.data * other.data, [this, other], '*');
    out._backward = () => {
      this.grad += other.data * out.grad;
      other.grad += this.data * out.grad;
    };
    return out;
  }

  pow(exponent) {
    const out = new Value(Math.pow(this.data, exponent), [this], `**${exponent}`);
    out._backward = () => {
      this.grad += (exponent * Math.pow(this.data, exponent - 1)) * out.grad;
    };
    return out;
  }

  log() {
    const out = new Value(Math.log(this.data), [this], 'log');
    out._backward = () => {
      this.grad += (1 / this.data) * out.grad;
    };
    return out;
  }

  exp() {
    const out = new Value(Math.exp(this.data), [this], 'exp');
    out._backward = () => {
      this.grad += out.data * out.grad;
    };
    return out;
  }

  relu() {
    const out = new Value(this.data < 0 ? 0 : this.data, [this], 'ReLU');
    out._backward = () => {
      this.grad += (out.data > 0 ? 1 : 0) * out.grad;
    };
    return out;
  }

  neg() { return this.mul(-1); }
  sub(other) { return this.add(other instanceof Value ? other.neg() : new Value(-other)); }
  div(other) {
    other = other instanceof Value ? other : new Value(other);
    return this.mul(other.pow(-1));
  }

  backward() {
    const topo = [];
    const visited = new Set();
    const buildTopo = (v) => {
      if (!visited.has(v)) {
        visited.add(v);
        for (const child of v._prev) {
          buildTopo(child);
        }
        topo.push(v);
      }
    };
    buildTopo(this);
    this.grad = 1;
    for (let i = topo.length - 1; i >= 0; i--) {
      topo[i]._backward();
    }
  }
}

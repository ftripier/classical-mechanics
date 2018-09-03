import Input from "./input";

interface Map<T> {
  [key: string]: T;
}

interface State {
  startTime: number;
  time: number;
  dt: number;
  width: number;
  height: number;
  system: Map<any>;
}

class Engine {
  queue: Function[];
  ctx: CanvasRenderingContext2D;
  state: State;
  constructor(canvas: HTMLCanvasElement) {
    this.queue = [];
    const ctx = <CanvasRenderingContext2D>canvas.getContext("2d");
    this.ctx = ctx;
    this.state = {
      startTime: 0,
      time: 0,
      dt: 0,
      width: 0,
      height: 0,
      system: {}
    };

    const resizeCanvas = () => {
      const canvas = <HTMLCanvasElement>document.getElementById("canvas");
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas) {
        canvas.height = height;
        canvas.width = width;
      }
      this.state.width = width;
      this.state.height = height;
    };
    window.addEventListener("resize", () => {
      this.nextFrame(resizeCanvas);
    });
    resizeCanvas();
  }

  nextFrame(cb: (state: State, ctx: CanvasRenderingContext2D) => void) {
    this.queue.push(cb);
  }

  run(time: number) {
    if (!this.state.startTime) {
      this.state.startTime = time;
    }
    this.state.dt = time - this.state.time;
    this.state.time = time;
    const enqeued = this.queue.length;
    for (let i = 0; i < enqeued; i += 1) {
      const cb = this.queue.shift();
      if (cb) {
        cb(this.state, this.ctx);
      }
    }
    if (this.queue.length > 0) {
      window.requestAnimationFrame(this.run.bind(this));
    }
  }
}

function getCenter(state: State) {
  return [state.width >> 1, state.height >> 1];
}

function draw(state: State, ctx: CanvasRenderingContext2D) {
  const center = getCenter(state);
  const ballSize = 10;
  const rodLength = 75;

  const ballPosition = [
    Math.sin(state.system.theta) * (rodLength + ballSize) + center[0],
    Math.cos(state.system.theta) * (rodLength + ballSize) + center[1]
  ];
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.beginPath();
  ctx.fillStyle = "black";
  ctx.arc(ballPosition[0], ballPosition[1], ballSize, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(center[0], center[1]);
  ctx.lineTo(ballPosition[0], ballPosition[1]);
  ctx.stroke();
}

const INITIAL_ANGULAR_VELOCITY = Math.PI * (1 / 2);
const INITIAL_THETA = 0;
const INITIAL_ENERGY = 0.23370055013616975;
const INITIAL_GRAVITY = 1;
const MASS = 1;
const EPSILON = 1e-1;

const kineticEnergy = (mass: number, angularVelocity: number) =>
  (mass * angularVelocity ** 2) / 2;
const potentialEnergy = (gravity: number, mass: number, theta: number) =>
  -gravity * mass * Math.cos(theta);

function getCurrentEnergy(state: State) {
  return (
    kineticEnergy(MASS, state.system.angularVelocity) +
    potentialEnergy(state.system.gravity, MASS, state.system.theta)
  );
}

function correctEnergy(state: State) {
  const currentEnergy = getCurrentEnergy(state);

  // the only degree of freedom in the hamiltonian is the angular velocity
  // so we only consider the partial derivative with respect to angular velocity
  const energyDifference = currentEnergy - state.system.energy;
  if (Math.abs(energyDifference) > EPSILON) {
    const velocityPartial = state.system.angularVelocity;
    const adjustment = Math.abs(energyDifference / velocityPartial);
    const energySign = energyDifference > 0 ? -1 : 1;
    const velocitySign = state.system.angularVelocity > 0 ? 1 : -1;
    state.system.angularVelocity += energySign * velocitySign * adjustment;
    const newEnergy = getCurrentEnergy(state);
  }
}

function evolveSystem(state: State, dt: number) {
  const gravity = state.system.gravity;

  const gravitationalAcceleration = -gravity * Math.sin(state.system.theta);

  state.system.theta += state.system.angularVelocity * (dt / 1000);
  state.system.angularVelocity += gravitationalAcceleration * (dt / 1000);
  // floating point errors in will compound and gradually add energy to the
  // system unless we correct for it
  correctEnergy(state);

  // to prevent floating point overflow, we clamp theta between [0, PI*2]
  if (Math.abs(state.system.theta) > Math.PI * 2) {
    const sign = state.system.theta > 0 ? -1 : 1;
    state.system.theta +=
      sign * Math.PI * 2 * Math.floor(state.system.theta / (Math.PI * 2));
  }
}

function update(state: State) {
  let dt = state.dt;
  while (dt > 0) {
    const expectedFrameTime = 16 + 2 / 3;
    const normalizedDt = Math.min(dt, expectedFrameTime);
    evolveSystem(state, normalizedDt);
    dt -= expectedFrameTime;
  }
}

const canvas = <HTMLCanvasElement>document.getElementById("canvas");
const engine = new Engine(canvas);

const energyInput = new Input("Energy", String(INITIAL_ENERGY), (e?: Event) => {
  engine.state.system.energy = energyInput.getValue();
});

const gravityInput = new Input(
  "Gravity",
  String(INITIAL_GRAVITY),
  (e?: Event) => {
    engine.state.system.gravity = gravityInput.getValue();
    engine.state.system.angularVelocity = INITIAL_ANGULAR_VELOCITY;
    engine.state.system.theta = INITIAL_THETA;
    energyInput.setValue(getCurrentEnergy(engine.state));
  }
);

engine.state.system.energy = energyInput.getValue();
engine.state.system.gravity = gravityInput.getValue();
engine.state.system.theta = INITIAL_THETA;
engine.state.system.angularVelocity = INITIAL_ANGULAR_VELOCITY;

const loop = (state: State, ctx: CanvasRenderingContext2D) => {
  update(state);
  draw(state, ctx);
  engine.nextFrame(loop);
};
engine.nextFrame(loop);
window.requestAnimationFrame(engine.run.bind(engine));

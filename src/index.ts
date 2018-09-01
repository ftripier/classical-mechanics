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

const canvas = <HTMLCanvasElement>document.getElementById("canvas");
const engine = new Engine(canvas);
const EPSILON = 1e-4;

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

const INITIAL_ANGULAR_VELOCITY = Math.PI * (1 / 128);
const INITIAL_THETA = 0;

function update(state: State) {
  if (state.system.theta == null) {
    state.system.theta = INITIAL_THETA;
  }
  if (state.system.angularVelocity == null) {
    state.system.angularVelocity = INITIAL_ANGULAR_VELOCITY;
  }
  const gravity = 0.001;
  const mass = 1;
  const gravitationalAcceleration = -gravity * Math.sin(state.system.theta);

  const normalizedDt = state.dt / (16 + 2 / 3);
  const oldTheta = state.system.theta;
  const oldAngularVelocity = state.system.angularVelocity;
  let newTheta = oldTheta + oldAngularVelocity * normalizedDt;
  let newAngularVelocity =
    oldAngularVelocity + gravitationalAcceleration * normalizedDt;

  // because of floating point error, the energy of the system rises over time.
  // this hopefully to corrects that over time.
  const potentialEnergy = (gravity: number, mass: number, theta: number) =>
    -gravity * mass * Math.cos(theta);
  const kineticEnergy = (mass: number, angularVelocity: number) =>
    (mass * angularVelocity ** 2) / 2;
  const currentEnergy = kineticEnergy(mass, newAngularVelocity);
  const initialEnergy = kineticEnergy(mass, INITIAL_ANGULAR_VELOCITY);

  // because the position is circular, we choose to correct for
  // error by modifying the angular velocity, and so we only consider the
  // partial derivative of energy with respect to velocity.
  const energyDiff = currentEnergy - initialEnergy;
  if (energyDiff > EPSILON) {
    const velocityPartial = newAngularVelocity;
    const adjustment = energyDiff / velocityPartial;
    newAngularVelocity -= adjustment;
  }

  state.system.angularVelocity = newAngularVelocity;
  state.system.theta = newTheta;

  while (state.system.theta - Math.PI * 2 > 0) {
    state.system.theta -= Math.PI * 2;
  }
}

const loop = (state: State, ctx: CanvasRenderingContext2D) => {
  update(state);
  draw(state, ctx);
  engine.nextFrame(loop);
};
engine.nextFrame(loop);
window.requestAnimationFrame(engine.run.bind(engine));

interface State {
  startTime: number;
  time: number;
  dt: number;
  width: number;
  height: number;
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
      height: 0
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
const loop = (state: State, ctx: CanvasRenderingContext2D) => {
  engine.nextFrame(loop);
};
engine.nextFrame(loop);
window.requestAnimationFrame(engine.run.bind(engine));

export class GameLoop {
  private rafId: number = 0;
  private accumulator: number = 0;
  private lastTime: number = 0;
  private tickRate: number = 1000 / 60;
  private onTick: (dt: number) => void;

  constructor(onTick: (dt: number) => void, tickRate?: number) {
    this.onTick = onTick;
    if (tickRate) this.tickRate = tickRate;
  }

  start(): void {
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }

  private loop = (now: number): void => {
    const frameTime = Math.min(now - this.lastTime, 100);
    this.lastTime = now;
    this.accumulator += frameTime;

    while (this.accumulator >= this.tickRate) {
      this.onTick(this.tickRate);
      this.accumulator -= this.tickRate;
    }

    this.rafId = requestAnimationFrame(this.loop);
  };
}

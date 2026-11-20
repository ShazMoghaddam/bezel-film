/** A standard two-pole audio filter (the "RBJ cookbook" biquad), used to shape instrument colours. */
export class Filter {
  private b0 = 0;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  constructor(
    private readonly type: "lowpass" | "highpass" | "bandpass",
    hz: number,
    private readonly q = 0.707,
    private readonly sampleRate = 44_100,
  ) {
    this.tune(hz);
  }

  /** Moves the filter's frequency, so sounds can open and close over time. */
  tune(hz: number) {
    const w = (2 * Math.PI * Math.min(hz, this.sampleRate * 0.45)) / this.sampleRate;
    const alpha = Math.sin(w) / (2 * this.q);
    const cos = Math.cos(w);
    const a0 = 1 + alpha;
    if (this.type === "lowpass") {
      this.b0 = (1 - cos) / 2 / a0;
      this.b1 = (1 - cos) / a0;
      this.b2 = this.b0;
    } else if (this.type === "highpass") {
      this.b0 = (1 + cos) / 2 / a0;
      this.b1 = -(1 + cos) / a0;
      this.b2 = this.b0;
    } else {
      this.b0 = alpha / a0;
      this.b1 = 0;
      this.b2 = -alpha / a0;
    }
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  run(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

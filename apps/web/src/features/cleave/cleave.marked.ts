import { checkMarkers, CleaveError } from "./cleave";

/** Progress is independent of the native renderer. Its resolved-file events are the input. */
export class MarkedProgress {
  readonly text: string;
  private readonly pending: Set<number>;
  private readonly total: number;
  private resolvedText: string;
  constructor(text: string) {
    const check = checkMarkers(text);
    if (check.status !== "complete") {
      throw new CleaveError({ reason: "markers" });
    }
    this.text = text;
    this.resolvedText = text;
    this.total = check.conflicts;
    this.pending = new Set(
      Array.from({ length: this.total }, (_, index) => index)
    );
  }
  get ids() {
    return [...this.pending];
  }
  get view() {
    return {
      remaining: this.pending.size,
      chosen: this.total - this.pending.size,
      resolved: this.pending.size === 0 ? this.resolvedText : null,
    };
  }
  receive(id: number, text: string) {
    if (!this.pending.delete(id)) {
      return;
    }
    this.resolvedText = text;
  }
  reset() {
    return new MarkedProgress(this.text);
  }
}

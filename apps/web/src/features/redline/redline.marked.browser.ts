import { MarkedProgress } from "./redline.marked";
import type { Choice } from "./redline.session";

/** The browser connects native actions to the pure progress model. */
export class MarkedSession {
  private readonly progress: MarkedProgress;
  private resolver: ((id: number, choice: Choice) => void) | null = null;
  private constructor(progress: MarkedProgress) {
    this.progress = progress;
  }
  static create(text: string) {
    return new MarkedSession(new MarkedProgress(text));
  }
  get text() {
    return this.progress.text;
  }
  get view() {
    return this.progress.view;
  }
  connect(resolver: (id: number, choice: Choice) => void) {
    this.resolver = resolver;
  }
  disconnect() {
    this.resolver = null;
  }
  choose(id: number, choice: Choice) {
    if (this.progress.ids.includes(id)) {
      this.resolver?.(id, choice);
    }
  }
  chooseAll(choice: Choice) {
    for (const id of this.progress.ids) {
      this.choose(id, choice);
    }
  }
  receive(id: number, text: string) {
    this.progress.receive(id, text);
  }
  reset() {
    return new MarkedSession(this.progress.reset());
  }
}

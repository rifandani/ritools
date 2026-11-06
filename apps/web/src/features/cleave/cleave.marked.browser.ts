import type { Resolution } from "./cleave.files";
import { MarkedProgress } from "./cleave.marked";
import type { Choice } from "./cleave.session";

/** The browser connects native actions to the pure progress model. */
export class MarkedSession {
  private readonly progress: MarkedProgress;
  private resolver: ((id: number, choice: Choice) => void) | null = null;
  private readonly choices: Resolution[] = [];
  private constructor(
    progress: MarkedProgress,
    choices: readonly Resolution[] = []
  ) {
    this.progress = progress;
    this.choices.push(...choices);
  }
  static create(text: string, choices: readonly Resolution[] = []) {
    return new MarkedSession(new MarkedProgress(text), choices);
  }
  get text() {
    return this.progress.text;
  }
  get view() {
    return this.progress.view;
  }
  connect(resolver: (id: number, choice: Choice) => void) {
    this.resolver = resolver;
    for (const resolution of this.choices) {
      resolver(resolution.id, resolution.choice);
    }
  }
  disconnect() {
    this.resolver = null;
  }
  choose(id: number, choice: Choice) {
    if (this.progress.ids.includes(id)) {
      this.resolver?.(id, choice);
    }
  }
  // fallow-ignore-next-line unused-class-member -- Called through the page's session union.
  chooseAll(choice: Choice) {
    for (const id of this.progress.ids) {
      this.choose(id, choice);
    }
  }
  receive(id: number, text: string, choice: Choice) {
    this.progress.receive(id, text);
    if (!this.choices.some((item) => item.id === id)) {
      this.choices.push({ id, choice });
    }
  }
  // fallow-ignore-next-line unused-class-member -- Called through the page's session union.
  reset() {
    return new MarkedSession(this.progress.reset());
  }
}

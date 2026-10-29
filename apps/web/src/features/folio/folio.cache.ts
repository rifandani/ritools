/* oxlint-disable eslint/no-empty-function -- The default close callback intentionally does nothing. */
/** A bounded least-recently-used cache with byte and count limits. */
export interface CacheLimits {
  readonly maxCount: number;
  readonly maxBytes: number;
}

export class BoundedCache<K, V> {
  private readonly entries = new Map<K, { value: V; bytes: number }>();
  private readonly limits: CacheLimits;
  private readonly sizeOf: (value: V) => number;
  private readonly close: (value: V) => void;
  private bytes = 0;

  constructor(
    limits: CacheLimits,
    sizeOf: (value: V) => number,
    close: (value: V) => void = () => {}
  ) {
    this.limits = limits;
    this.sizeOf = sizeOf;
    this.close = close;
  }

  get count(): number {
    return this.entries.size;
  }

  get retainedBytes(): number {
    return this.bytes;
  }

  get(key: K): V | null {
    const found = this.entries.get(key);
    if (!found) {
      return null;
    }
    this.entries.delete(key);
    this.entries.set(key, found);
    return found.value;
  }

  set(key: K, value: V): void {
    const previous = this.entries.get(key);
    if (previous) {
      this.entries.delete(key);
      this.bytes -= previous.bytes;
      if (previous.value !== value) {
        this.close(previous.value);
      }
    }
    const bytes = Math.max(this.sizeOf(value), 0);
    this.entries.set(key, { value, bytes });
    this.bytes += bytes;
    this.evict();
  }

  delete(key: K): boolean {
    const found = this.entries.get(key);
    if (!found) {
      return false;
    }
    this.entries.delete(key);
    this.bytes -= found.bytes;
    this.close(found.value);
    return true;
  }

  clear(): void {
    for (const { value } of this.entries.values()) {
      this.close(value);
    }
    this.entries.clear();
    this.bytes = 0;
  }

  private evict(): void {
    while (
      (this.entries.size > this.limits.maxCount ||
        this.bytes > this.limits.maxBytes) &&
      this.entries.size > 0
    ) {
      const oldest = this.entries.keys().next();
      if (oldest.done) {
        return;
      }
      this.delete(oldest.value);
    }
  }
}

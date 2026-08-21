/**
 * Simple fixed-window rate limiter, one bucket per connection.
 * Not for distributed use -- fine for a single relay process.
 */
export class RateLimiter {
  private counts = new Map<object, { count: number; windowStart: number }>();

  constructor(
    private readonly maxPerWindow: number,
    private readonly windowMs: number,
  ) {}

  /** Returns true if the call is allowed, false if it should be dropped. */
  allow(key: object): boolean {
    const now = Date.now();
    const entry = this.counts.get(key);

    if (!entry || now - entry.windowStart > this.windowMs) {
      this.counts.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= this.maxPerWindow) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  forget(key: object): void {
    this.counts.delete(key);
  }
}

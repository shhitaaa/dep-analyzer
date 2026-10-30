import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("cache", () => {
  let getCached: typeof import("./cache").getCached;
  let setCached: typeof import("./cache").setCached;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    ({ getCached, setCached } = await import("./cache.js"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for a key that was never set", () => {
    expect(getCached("missing")).toBeNull();
  });

  it("returns the stored value", () => {
    setCached("a", { hello: "world" });
    expect(getCached("a")).toEqual({ hello: "world" });
  });

  it("still returns the value just before the 10 minute TTL", () => {
    setCached("a", "value");
    vi.advanceTimersByTime(10 * 60 * 1000 - 1000);
    expect(getCached("a")).toBe("value");
  });

  it("returns null once the 10 minute TTL has passed", () => {
    setCached("a", "value");
    vi.advanceTimersByTime(10 * 60 * 1000 + 1000);
    expect(getCached("a")).toBeNull();
  });

  it("evicts the oldest entry when more than 200 are stored", () => {
    for (let i = 0; i <= 200; i++) {
      setCached(`key-${i}`, i);
    }
    expect(getCached("key-0")).toBeNull(); // oldest, evicted
    expect(getCached("key-1")).toBe(1);
    expect(getCached("key-200")).toBe(200); // newest, kept
  });

  it("re-setting a key makes it the newest, so it survives eviction", () => {
    for (let i = 0; i < 200; i++) {
      setCached(`key-${i}`, i);
    }
    setCached("key-0", "refreshed"); // moves key-0 to the newest position
    setCached("key-200", 200); // pushes size to 201, evicts the oldest

    expect(getCached("key-0")).toBe("refreshed");
    expect(getCached("key-1")).toBeNull(); // key-1 is now the oldest
  });
});
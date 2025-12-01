// Lightweight multi-level cache inspired by ecosystem guidelines
// L1 (instance) will be handled in components via refs/state; this is L2 (module-level) cache

const l2Cache = new Map<string, any>();

export function cacheGet<T>(key: string): T | undefined {
  return l2Cache.get(key) as T | undefined;
}

export function cacheSet<T>(key: string, value: T) {
  l2Cache.set(key, value);
}

export function cacheHas(key: string) {
  return l2Cache.has(key);
}


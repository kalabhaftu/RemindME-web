type Window = { count: number; resetAt: number }

const stores = new Map<string, Map<string, Window>>()

function getStore(name: string) {
  if (!stores.has(name)) stores.set(name, new Map())
  return stores.get(name)!
}

function sweep(store: Map<string, Window>) {
  const now = Date.now()
  for (const [key, w] of store) {
    if (now > w.resetAt) store.delete(key)
  }
}

export function rateLimit(opts: { interval: number; max: number }) {
  return (key: string): { ok: boolean; remaining: number; resetIn: number } => {
    const store = getStore(`rl:${opts.interval}:${opts.max}`)
    sweep(store)
    const now = Date.now()
    const w = store.get(key)
    if (!w || now > w.resetAt) {
      store.set(key, { count: 1, resetAt: now + opts.interval })
      return { ok: true, remaining: opts.max - 1, resetIn: opts.interval }
    }
    if (w.count >= opts.max) {
      return { ok: false, remaining: 0, resetIn: w.resetAt - now }
    }
    w.count++
    return { ok: true, remaining: opts.max - w.count, resetIn: w.resetAt - now }
  }
}

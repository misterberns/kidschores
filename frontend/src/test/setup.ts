import '@testing-library/jest-dom/vitest'

// Node >= 25 enables its own Web Storage API by default, which conflicts with
// the vitest jsdom environment and leaves `localStorage` undefined/broken in
// tests (vitest-dev/vitest#8757). Provide an in-memory implementation on both
// window and globalThis so tests behave identically on every Node version.
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear() {
    this.store.clear()
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
}
for (const target of [window, globalThis]) {
  Object.defineProperty(target, 'localStorage', {
    writable: true,
    configurable: true,
    value: new MemoryStorage(),
  })
  Object.defineProperty(target, 'sessionStorage', {
    writable: true,
    configurable: true,
    value: new MemoryStorage(),
  })
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

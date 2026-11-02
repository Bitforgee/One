import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// o jsdom não tem ResizeObserver; o use-stick-to-bottom (Conversation) usa
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// nem matchMedia; a gaveta (Vaul) consulta ao abrir. Sem media query, nenhuma consulta casa
window.matchMedia ??= (media: string) =>
  ({ media, matches: false, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

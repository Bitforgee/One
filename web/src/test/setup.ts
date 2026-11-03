import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toast } from 'sonner'
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
  toast.dismiss() // o Sonner guarda os toasts no módulo: os de um teste não passam para o seguinte
  vi.unstubAllGlobals()
})

// o jsdom não mede layout; o ProseMirror (Tiptap) mede a seleção com estas APIs
const SemCaixa = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) }
Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
Range.prototype.getBoundingClientRect ??= () => SemCaixa as DOMRect
document.elementFromPoint ??= () => null

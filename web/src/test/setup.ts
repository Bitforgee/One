import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeEach, vi } from 'vitest'

// tempo-real-signalr: o jsdom não tem servidor; toda conexão do app é esta, que nasce fora de Connected (start() fica pendente),
// de modo que o relê de 15 s dos testes antigos segue valendo. Cada teste dirige a sua: abrir(), cair(), reconectar(), fechar(), emitir().
class ConexaoFalsa {
  state = 'Disconnected'
  starts = 0
  stops = 0
  segurarStop = false // stop() fica em Disconnecting até concluirStop()
  invocacoes: unknown[][] = []
  private ouvintes = new Map<string, ((...a: any[]) => void)[]>()
  private aoCair: (() => void)[] = []
  private aoReconectar: (() => void)[] = []
  private aoFechar: (() => void)[] = []
  private resolverStart?: () => void
  private rejeitarStart?: (e: Error) => void
  private resolverStop?: () => void
  reconexaoAutomatica = false
  constructor(readonly url: string) {}
  on(nome: string, f: (...a: any[]) => void) {
    this.ouvintes.set(nome, [...(this.ouvintes.get(nome) ?? []), f])
  }
  onreconnecting(f: () => void) {
    this.aoCair.push(f)
  }
  onreconnected(f: () => void) {
    this.aoReconectar.push(f)
  }
  onclose(f: () => void) {
    this.aoFechar.push(f)
  }
  invoke(nome: string, ...args: unknown[]) {
    this.invocacoes.push([nome, ...args])
    return Promise.resolve()
  }
  start() {
    this.starts++
    if (globalThis.recusarConexao) {
      this.state = 'Disconnected'
      return Promise.reject(new Error(globalThis.recusarConexao))
    }
    this.state = 'Connecting'
    return new Promise<void>((resolve, reject) => {
      this.resolverStart = resolve
      this.rejeitarStart = reject
    })
  }
  stop() {
    this.stops++
    this.state = 'Disconnecting'
    this.rejeitarStart?.(new Error('conexão encerrada durante o start'))
    if (this.segurarStop) return new Promise<void>((resolve) => (this.resolverStop = resolve))
    this.state = 'Disconnected'
    return Promise.resolve()
  }
  concluirStop() {
    this.state = 'Disconnected'
    this.resolverStop?.()
    this.aoFechar.forEach((f) => f())
  }
  abrir() {
    this.state = 'Connected'
    this.resolverStart?.()
  }
  cair() {
    this.state = 'Reconnecting'
    this.aoCair.forEach((f) => f())
  }
  reconectar() {
    this.state = 'Connected'
    this.aoReconectar.forEach((f) => f())
  }
  fechar() {
    this.state = 'Disconnected'
    this.aoFechar.forEach((f) => f())
  }
  emitir(nome: string, ...args: unknown[]) {
    this.ouvintes.get(nome)?.forEach((f) => f(...args))
  }
  chamadas(nome: string) {
    return this.invocacoes.filter(([n]) => n === nome).map(([, ...a]) => a)
  }
}

// recusarConexao: o texto do erro com que start() falha (servidor fora, negotiate recusado); false abre normalmente
declare global {
  var conexoesFalsas: ConexaoFalsa[]
  var recusarConexao: string | false
}
globalThis.conexoesFalsas = []
globalThis.recusarConexao = false

vi.mock('@microsoft/signalr', () => ({
  HubConnectionState: { Disconnected: 'Disconnected', Connecting: 'Connecting', Connected: 'Connected', Disconnecting: 'Disconnecting', Reconnecting: 'Reconnecting' },
  LogLevel: { None: 6 },
  HubConnectionBuilder: class {
    private url = ''
    private automatica = false
    withUrl(url: string) {
      this.url = url
      return this
    }
    withAutomaticReconnect() {
      this.automatica = true
      return this
    }
    configureLogging() {
      return this
    }
    build() {
      const c = new ConexaoFalsa(this.url)
      c.reconexaoAutomatica = this.automatica
      globalThis.conexoesFalsas.push(c)
      return c
    }
  },
}))

beforeEach(() => {
  globalThis.conexoesFalsas = []
  globalThis.recusarConexao = false
})

// o jsdom não tem ResizeObserver; o use-stick-to-bottom (Conversation) e o React Flow (canvas) usam.
// Ao observar, avisa o tamanho do alvo uma vez, como o navegador: é assim que o React Flow mede os nós (reactflow.dev/learn/advanced-use/testing).
globalThis.ResizeObserver ??= class {
  constructor(private aviso: ResizeObserverCallback) {}
  observe(alvo: Element) {
    const caixa = { x: 0, y: 0, width: 100, height: 40, top: 0, right: 100, bottom: 40, left: 0, toJSON: () => ({}) }
    this.aviso([{ target: alvo, contentRect: caixa, borderBoxSize: [{ inlineSize: 100, blockSize: 40 }], contentBoxSize: [{ inlineSize: 100, blockSize: 40 }], devicePixelContentBoxSize: [] } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver)
  }
  unobserve() {}
  disconnect() {}
}

// nem DOMMatrixReadOnly, que o React Flow lê para saber a escala do painel; sem transformação a escala é 1
globalThis.DOMMatrixReadOnly ??= class {
  m22 = 1
  constructor(transformacao?: string) {
    const escala = transformacao?.match(/scale\(([\d.]+)\)/)?.[1]
    if (escala !== undefined) this.m22 = Number(escala)
  }
} as unknown as typeof DOMMatrixReadOnly

// e o tamanho dos elementos: o React Flow só mostra o nó depois de medi-lo
Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: { configurable: true, get: () => 40 },
  offsetWidth: { configurable: true, get: () => 100 },
})
;(SVGElement.prototype as SVGGraphicsElement).getBBox ??= () => ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect

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

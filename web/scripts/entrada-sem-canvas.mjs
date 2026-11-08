// fluxos-atendimento C94 (door 10): o pacote de entrada do build não pode conter o código da biblioteca do canvas.
// Roda depois de `npm --prefix web run build`; sai com 1 se a entrada (ou algo que o index.html pré-carrega) trouxer a biblioteca,
// ou se o build nem tiver um pacote com ela (a verificação então não provaria nada).
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const saida = resolve(dirname(fileURLToPath(import.meta.url)), '../../One.Api/wwwroot')
const MARCAS = ['react-flow__', '@xyflow']
const traz = (arquivo) => MARCAS.some((m) => readFileSync(arquivo, 'utf8').includes(m))

const html = readFileSync(join(saida, 'index.html'), 'utf8')
const carregadosJunto = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => join(saida, m[1]))
if (carregadosJunto.length === 0) {
  console.error('entrada-sem-canvas: o index.html não aponta para nenhum pacote em /assets.')
  process.exit(1)
}

const comBiblioteca = carregadosJunto.filter(traz)
if (comBiblioteca.length > 0) {
  console.error(`entrada-sem-canvas: a biblioteca do canvas está no pacote de entrada: ${comBiblioteca.join(', ')}`)
  process.exit(1)
}

const doCanvas = readdirSync(join(saida, 'assets')).filter((n) => n.endsWith('.js') && traz(join(saida, 'assets', n)))
if (doCanvas.length === 0) {
  console.error('entrada-sem-canvas: nenhum pacote do build tem a biblioteca do canvas.')
  process.exit(1)
}
console.log(`entrada-sem-canvas: ok. Entrada: ${carregadosJunto.map((a) => a.split(/[\\/]/).pop()).join(', ')}; canvas só em: ${doCanvas.join(', ')}`)

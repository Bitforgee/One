import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { duracao } from './tts.ts'

type PassoGravado = { id: string; texto: string; inicio: number; arquivo: string; duracao: number }
type Gravado = { id: string; celular?: boolean; selo?: string; sinc: number; corte: number; fim: number; passos: PassoGravado[] }

const Fontes = 'C\\:/Windows/Fonts'
const quebrar = (texto: string, max = 32) => {
  const linhas: string[] = []
  for (const palavra of texto.split(/\s+/)) {
    const atual = linhas.at(-1)
    if (atual !== undefined && atual.length + 1 + palavra.length <= max) linhas[linhas.length - 1] = `${atual} ${palavra}`
    else linhas.push(palavra)
  }
  return linhas.join('\n')
}
const txt = (nome: string, conteudo: string) => {
  const dir = path.join(import.meta.dirname, 'saida', 'txt')
  mkdirSync(dir, { recursive: true })
  const arquivo = path.join(dir, nome)
  writeFileSync(arquivo, conteudo)
  return path.relative(process.cwd(), arquivo).replace(/\\/g, '/')
}

const Saida = path.join(import.meta.dirname, 'saida')
const nome = process.argv[2] ?? 'principal'
const manifesto = JSON.parse(readFileSync(path.join(Saida, `${nome}.json`), 'utf8')) as { video: string; legendas: string; segmentos: string[] }
const so = process.argv[3]
const pasta = path.join(Saida, 'segmentos')
const quadros = path.join(Saida, 'quadros')
mkdirSync(quadros, { recursive: true })
const ffmpeg = (args: string[]) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })

function marca(webm: string, ate: number) {
  const px = execFileSync('ffmpeg', ['-v', 'error', '-t', String(ate), '-i', webm, '-vf', 'crop=8:8:8:8,scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
  for (let i = 0; i + 2 < px.length; i += 3) if (px[i] > 200 && px[i + 1] < 80 && px[i + 2] > 200) return i / 3 / 25
  throw new Error(`Marca de sincronia não encontrada em ${webm}`)
}

const srt: string[] = []
const relogio = (s: number) => {
  const ms = Math.round(s * 1000)
  const p = (n: number, d = 2) => String(n).padStart(d, '0')
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`
}

let deslocamento = 0
const mp4s: string[] = []
for (const id of manifesto.segmentos.filter((s) => !so || s === so)) {
  const g = JSON.parse(readFileSync(path.join(pasta, `${id}.json`), 'utf8')) as Gravado
  const saida = path.join(pasta, `${id}.mp4`)
  const webm = path.join(pasta, `${id}.webm`)
  const atraso = marca(webm, g.sinc + 3) - g.sinc
  const entradas = ['-ss', (g.corte + atraso).toFixed(3), '-i', webm]
  const filtros: string[] = []
  g.passos.forEach((p, i) => {
    entradas.push('-i', p.arquivo)
    const ms = Math.max(0, Math.round((p.inicio - g.corte) * 1000))
    filtros.push(`[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}:all=1[a${i}]`)
  })
  if (g.passos.length) filtros.push(`${g.passos.map((_, i) => `[a${i}]`).join('')}amix=inputs=${g.passos.length}:normalize=0:duration=longest,apad[a]`)
  else {
    entradas.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo')
    filtros.push('[1:a]anull[a]')
  }
  const total0 = g.fim - g.corte
  let mapaVideo = '0:v'
  let filtroVideo = ['-vf', 'fps=30,format=yuv420p']
  if (g.celular) {
    const bg = g.passos.length + 1
    entradas.push('-f', 'lavfi', '-i', 'color=c=0xf6f7f9:s=1280x720:r=30')
    const cadeia = [`[0:v]scale=-2:690:flags=lanczos,setsar=1,pad=iw+16:ih+16:8:8:color=0x111827[ph]`, `[${bg}:v][ph]overlay=x=130:y=(H-h)/2[b0]`]
    let ultimo = 'b0'
    const tag = txt(`${g.id}-tag.txt`, `Versão mobile${g.selo ? `  ·  ${g.selo}` : ''}`)
    cadeia.push(`[${ultimo}]drawtext=fontfile='${Fontes}/seguisb.ttf':textfile=${tag}:fontcolor=0x224fa7:fontsize=24:x=540:y=110[bt]`)
    ultimo = 'bt'
    g.passos.forEach((p, i) => {
      const a = Math.max(0, p.inicio - g.corte)
      const b = g.passos[i + 1] ? g.passos[i + 1].inicio - g.corte : total0
      const arq = txt(`${g.id}-${i}.txt`, quebrar(p.texto))
      cadeia.push(`[${ultimo}]drawtext=fontfile='${Fontes}/segoeui.ttf':textfile=${arq}:fontcolor=0x111827:fontsize=38:line_spacing=14:x=540:y=(h-text_h)/2:enable='between(t,${a.toFixed(2)},${b.toFixed(2)})'[bt${i}]`)
      ultimo = `bt${i}`
    })
    cadeia.push(`[${ultimo}]fps=30,format=yuv420p[v]`)
    filtros.push(...cadeia)
    mapaVideo = '[v]'
    filtroVideo = []
  }
  ffmpeg([
    ...entradas,
    '-filter_complex', filtros.join(';'),
    '-map', mapaVideo, '-map', '[a]',
    '-t', (g.fim - g.corte).toFixed(3),
    ...filtroVideo,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', saida,
  ])
  const total = duracao(saida)
  g.passos.forEach((p, i) => {
    const inicio = p.inicio - g.corte
    const fim = Math.min(inicio + p.duracao + 0.3, g.passos[i + 1] ? g.passos[i + 1].inicio - g.corte : total)
    srt.push(`${srt.length + 1}\n${relogio(deslocamento + inicio)} --> ${relogio(deslocamento + fim)}\n${p.texto}\n`)
    const fimDoPasso = (g.passos[i + 1] ? g.passos[i + 1].inicio - g.corte : total) - 0.3
    ffmpeg(['-ss', Math.max(0, fimDoPasso).toFixed(2), '-i', saida, '-frames:v', '1', path.join(quadros, `${id}-${p.id}.png`)])
    console.log(`  ${relogio(deslocamento + inicio)} ${p.id}`)
  })
  deslocamento += total
  mp4s.push(saida)
  console.log(`${id}: ${total.toFixed(2)} s (sincronia ${atraso >= 0 ? '+' : ''}${atraso.toFixed(2)} s)`)
}

if (so) process.exit(0)

mkdirSync(Saida, { recursive: true })
const lista = path.join(pasta, `${nome}.txt`)
writeFileSync(lista, mp4s.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'))
const final = path.join(Saida, manifesto.video)
ffmpeg(['-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-movflags', '+faststart', final])
writeFileSync(path.join(Saida, manifesto.legendas), srt.join('\n'))
console.log(`${final}: ${duracao(final).toFixed(2)} s`)

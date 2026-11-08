import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// Narração: um arquivo de áudio por texto, em cache pelo hash do texto (saida/audio/<hash>-<motor>.wav).
// Ordem: OpenAI gpt-4o-mini-tts, OpenAI tts-1, voz SAPI "Microsoft Maria Desktop" do Windows.
// Para trocar de voz ou motor, apague saida/audio.
const Pasta = path.join(import.meta.dirname, 'saida', 'audio')
const Raiz = path.resolve(import.meta.dirname, '..', '..')
const Instrucoes = 'Fale em português do Brasil, tom calmo e didático de apresentação acadêmica.'
const Modelos = [
  { modelo: 'gpt-4o-mini-tts', voz: 'coral', instructions: Instrucoes },
  { modelo: 'tts-1', voz: 'nova' },
]

export type Audio = { arquivo: string; duracao: number; motor: string }

// Duração em segundos, medida pelo ffprobe.
export function duracao(arquivo: string) {
  const saida = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo], { encoding: 'utf8' })
  return Number(saida.trim())
}

// A chave nunca é impressa nem gravada: vem do user-secrets da API ou do .env da raiz.
let chave: string | null | undefined
function chaveOpenAi() {
  if (chave !== undefined) return chave
  chave = null
  try {
    const segredos = execFileSync('dotnet', ['user-secrets', 'list', '--project', path.join(Raiz, 'One.Api')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    chave = segredos.match(/^Llm:ChaveApi = (.+)$/m)?.[1].trim() ?? null
  } catch {
    // sem dotnet ou sem segredos: tenta o .env
  }
  if (!chave && existsSync(path.join(Raiz, '.env')))
    chave = readFileSync(path.join(Raiz, '.env'), 'utf8').match(/^LLM_CHAVE_API=(.+)$/m)?.[1].trim() ?? null
  return chave
}

async function openAi(texto: string, destino: string) {
  const k = chaveOpenAi()
  if (!k) return null
  for (const m of Modelos) {
    try {
      const r = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: m.modelo, voice: m.voz, input: texto, response_format: 'mp3', ...(m.instructions ? { instructions: m.instructions } : {}) }),
      })
      if (r.ok) {
        const bruto = `${destino}.mp3`
        writeFileSync(bruto, Buffer.from(await r.arrayBuffer()))
        return aparar(bruto, `${destino}-${m.modelo}.wav`)
      }
      console.warn(`[tts] ${m.modelo} respondeu ${r.status}`)
    } catch (e) {
      console.warn(`[tts] ${m.modelo} falhou: ${(e as Error).name}`)
    }
  }
  return null
}

// Tira o silêncio do começo e do fim (a OpenAI às vezes devolve quase 2 s mudos no fim) e grava WAV,
// que tem a duração exata no cabeçalho.
function aparar(entrada: string, saida: string) {
  const corta = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05'
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', entrada, '-af', `${corta},areverse,${corta},areverse`, '-ar', '48000', '-ac', '1', saida])
  rmSync(entrada)
  return saida
}

function sapi(texto: string, destino: string) {
  const arquivo = `${destino}.sapi-bruto.wav`
  const script =
    'Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ' +
    "$s.SelectVoice('Microsoft Maria Desktop'); $s.SetOutputToWaveFile($env:TTS_ARQUIVO); $s.Speak($env:TTS_TEXTO); $s.Dispose()"
  // texto e caminho por variável de ambiente: sem problemas de aspas no PowerShell
  execFileSync('powershell', ['-NoProfile', '-Command', script], { env: { ...process.env, TTS_TEXTO: texto, TTS_ARQUIVO: arquivo }, stdio: 'ignore' })
  return aparar(arquivo, `${destino}-sapi.wav`)
}

const memoria = new Map<string, Audio>()

export async function narracao(texto: string): Promise<Audio> {
  const lembrado = memoria.get(texto)
  if (lembrado) return lembrado
  mkdirSync(Pasta, { recursive: true })
  const hash = createHash('sha1').update(texto).digest('hex').slice(0, 16)
  const existente = readdirSync(Pasta).find((f) => f.startsWith(`${hash}-`) && f.endsWith('.wav'))
  const destino = path.join(Pasta, hash)
  const arquivo = existente ? path.join(Pasta, existente) : ((await openAi(texto, destino)) ?? sapi(texto, destino))
  const audio = { arquivo, duracao: duracao(arquivo), motor: path.basename(arquivo, '.wav').slice(hash.length + 1) }
  memoria.set(texto, audio)
  return audio
}

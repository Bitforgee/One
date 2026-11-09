import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { test } from '@playwright/test'
import { gravar, Saida, type Roteiro } from './kit'
import { roteiro as amostra } from './cenas/amostra'
import { roteiro as principal } from './cenas/principal'

const Roteiros: Record<string, Roteiro> = { amostra, principal }
const nome = process.env.ROTEIRO ?? 'principal'
const roteiro = Roteiros[nome]
if (!roteiro) throw new Error(`Roteiro desconhecido: ${nome}`)

test.describe.configure({ mode: 'serial' })

for (const seg of roteiro.segmentos) test(seg.id, ({ browser }) => gravar(browser, seg))

test.afterAll(() => {
  mkdirSync(Saida, { recursive: true })
  writeFileSync(
    path.join(Saida, `${nome}.json`),
    JSON.stringify({ video: roteiro.video, legendas: roteiro.legendas, segmentos: roteiro.segmentos.map((s) => s.id) }, null, 2),
  )
})

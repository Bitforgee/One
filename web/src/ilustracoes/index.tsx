import { createElement } from 'react'

// Ilustrações próprias (aparencia-instituicao door 9): só formas, pintadas com currentColor e os tokens da marca,
// para pegar a cor da instituição. Decorativas: a tela já diz o que é em texto.
const Suave = 'var(--primary-subtle)'
const Forte = 'var(--primary)'

type Forma = [tag: 'path' | 'circle' | 'ellipse' | 'rect', atributos: Record<string, string | number>]

// Cada desenho é uma lista de formas num quadro de 160 x 120; o resto (traço, cantos, aria-hidden) é comum.
const Desenhos: Record<string, Forma[]> = {
  'boas-vindas': [
    ['circle', { cx: 80, cy: 62, r: 50, fill: Suave, stroke: 'none' }],
    ['path', { d: 'M40 54 80 30l40 24z', fill: Forte, stroke: Forte }],
    ['path', { d: 'M48 58h64M56 62v26M72 62v26M88 62v26M104 62v26M44 92h72M38 100h84' }],
    ['circle', { cx: 80, cy: 46, r: 4, fill: Suave, stroke: 'none' }],
    ['path', { d: 'M132 22v10M127 27h10M26 36v6M23 39h6', stroke: Forte }],
  ],
  'conversa': [
    ['path', { d: 'M30 28h62a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8H58L44 82V70H30a8 8 0 0 1-8-8V36a8 8 0 0 1 8-8z', fill: Suave }],
    ['path', { d: 'M36 44h48M36 54h30' }],
    ['path', { d: 'M72 62h50a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8h-8v12l-14-12H72a8 8 0 0 1-8-8V70a8 8 0 0 1 8-8z', fill: Forte, stroke: Forte, transform: 'translate(8 -4)' }],
    ['circle', { cx: 90, cy: 86, r: 2.5, fill: Suave, stroke: 'none' }],
    ['circle', { cx: 102, cy: 86, r: 2.5, fill: Suave, stroke: 'none' }],
    ['circle', { cx: 114, cy: 86, r: 2.5, fill: Suave, stroke: 'none' }],
  ],
  'caixa-vazia': [
    ['ellipse', { cx: 80, cy: 102, rx: 44, ry: 6, fill: Suave, stroke: 'none' }],
    ['path', { d: 'M28 66 42 34h76l14 32v26a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6z', fill: Suave }],
    ['path', { d: 'M28 66h34l6 12h24l6-12h34' }],
    ['path', { d: 'M80 12v12M70 18l10 8 10-8M134 20v8M130 24h8M24 22v6M21 25h6', stroke: Forte }],
  ],
  'documento': [
    ['ellipse', { cx: 80, cy: 106, rx: 40, ry: 5, fill: Suave, stroke: 'none' }],
    ['path', { d: 'M50 22h40l22 22v56a4 4 0 0 1-4 4H54a4 4 0 0 1-4-4z', transform: 'translate(-10 -4)' }],
    ['path', { d: 'M60 14h40l24 24v62a4 4 0 0 1-4 4H60a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z', fill: Suave }],
    ['path', { d: 'M100 14v20a4 4 0 0 0 4 4h20' }],
    ['path', { d: 'M68 52h40M68 64h40M68 76h24' }],
    ['circle', { cx: 112, cy: 88, r: 10, fill: Forte, stroke: Forte }],
    ['path', { d: 'm107 88 3.5 3.5L117 85', stroke: Suave }],
  ],
  'pessoas': [
    ['ellipse', { cx: 80, cy: 104, rx: 52, ry: 6, fill: Suave, stroke: 'none' }],
    ['circle', { cx: 42, cy: 52, r: 10, fill: Suave }],
    ['path', { d: 'M24 94v-6a18 18 0 0 1 18-18 18 18 0 0 1 18 18v6', fill: Suave }],
    ['circle', { cx: 118, cy: 52, r: 10, fill: Suave }],
    ['path', { d: 'M100 94v-6a18 18 0 0 1 18-18 18 18 0 0 1 18 18v6', fill: Suave }],
    ['circle', { cx: 80, cy: 42, r: 13, fill: Forte, stroke: Forte }],
    ['path', { d: 'M56 98v-8a24 24 0 0 1 48 0v8z', fill: Forte, stroke: Forte }],
  ],
  'grafico': [
    ['path', { d: 'M26 20v80h112' }],
    ['rect', { x: 38, y: 68, width: 16, height: 32, rx: 2, fill: Suave }],
    ['rect', { x: 62, y: 48, width: 16, height: 52, rx: 2, fill: Forte, stroke: Forte }],
    ['rect', { x: 86, y: 58, width: 16, height: 42, rx: 2, fill: Suave }],
    ['rect', { x: 110, y: 34, width: 16, height: 66, rx: 2, fill: Suave }],
    ['path', { d: 'm38 40 24-14 24 8 40-18', stroke: Forte, strokeDasharray: '3 5' }],
  ],
}

function Desenho({ nome, className }: { nome: string; className?: string }) {
  return (
    <svg data-ilustracao={nome} aria-hidden="true" viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {Desenhos[nome].map(([tag, atributos], i) => createElement(tag, { key: i, ...atributos }))}
    </svg>
  )
}

type Props = { className?: string }

export const BoasVindas = ({ className }: Props) => <Desenho nome="boas-vindas" className={className} />
export const Conversa = ({ className }: Props) => <Desenho nome="conversa" className={className} />
export const CaixaVazia = ({ className }: Props) => <Desenho nome="caixa-vazia" className={className} />
export const Documento = ({ className }: Props) => <Desenho nome="documento" className={className} />
export const Pessoas = ({ className }: Props) => <Desenho nome="pessoas" className={className} />
export const Grafico = ({ className }: Props) => <Desenho nome="grafico" className={className} />

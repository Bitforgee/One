import { ExternalLink } from 'lucide-react'
import { Button } from './ui/button'

export const PorUrl = /(https?:\/\/[^\s<>()"']+)/i
const UrlFinal = /(https?:\/\/[^\s<>()"']+?)[\s.,;:!?)]*$/i
export const semPontuacao = (url: string) => url.replace(/[.,;:!?]+$/, '')

function aparar(antes: string, cauda: string) {
  const paren = cauda.includes(')') ? antes.match(/\s*\((?:\p{L}+[\s:]+){0,2}$/u) : null
  const resto = (paren ? antes.slice(0, paren.index) : antes).replace(/[\s(]+$/, '').replace(/\s+[-–—|]$/, '')
  return { resto, fim: paren ? (cauda.match(/[.!?]/)?.[0] ?? '') : '' }
}

function fechar(resto: string) {
  const frase = /[:?!]$/.test(resto) ? resto : resto.replace(/[.,;]+$/, '')
  return /[\p{L}\p{N}]$/u.test(frase) ? `${frase}:` : frase
}

export function separarLinks(texto: string) {
  const links: string[] = []
  let resto = texto.trimEnd()
  let fim = ''
  for (let m = resto.match(UrlFinal); m; m = resto.match(UrlFinal)) {
    const url = semPontuacao(m[1])
    if (!links.includes(url)) links.unshift(url)
    const antes = resto.slice(0, m.index)
    const semJuncao = antes.replace(/(?:\s+e)?[\s,;(]*$/, '')
    if (!UrlFinal.test(semJuncao)) {
      ;({ resto, fim } = aparar(antes, m[0].slice(m[1].length)))
      break
    }
    resto = semJuncao
  }
  if (!links.length) return { texto, links }
  return { texto: fim ? resto + fim : fechar(resto), links }
}

export const rotulo = (link: string) => {
  if (!URL.canParse(link)) return link
  const u = new URL(link)
  return u.hostname.replace(/^www\./, '') + (u.pathname.length > 1 ? u.pathname.replace(/\/$/, '') : '')
}

export function Links({ links }: { links: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {links.map((link) => (
        <Button key={link} asChild variant="outline" size="sm" className="max-w-full bg-background">
          <a href={link} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" />
            <span className="truncate">{rotulo(link)}</span>
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </Button>
      ))}
    </div>
  )
}

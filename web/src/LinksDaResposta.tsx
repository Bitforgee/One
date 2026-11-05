import { ExternalLink } from 'lucide-react'
import { Button } from './ui/button'

// Mesma regra de URL do backend (Conferencia.Url), que já recusa a resposta com link fora das fontes citadas.
export const PorUrl = /(https?:\/\/[^\s<>()"']+)/i
// URL que fecha o texto (só pontuação, espaço ou ")" depois dela)
const UrlFinal = /(https?:\/\/[^\s<>()"']+?)[\s.,;:!?)]*$/i
export const semPontuacao = (url: string) => url.replace(/[.,;:!?]+$/, '')

// Os links que fecham a resposta (só espaço, pontuação ou "e" entre eles) saem do texto e viram botões; a frase que
// os apresenta termina em ":". Link no meio do texto fica onde está (Balao o desenha como link curto).
export function separarLinks(texto: string) {
  const links: string[] = []
  let resto = texto.trimEnd()
  for (let m = resto.match(UrlFinal); m; m = resto.match(UrlFinal)) {
    const url = semPontuacao(m[1])
    if (!links.includes(url)) links.unshift(url)
    const antes = resto.slice(0, m.index)
    // "https://a e https://b": o "e" que junta dois links finais sai junto; antes de texto comum ele fica
    const semJuncao = antes.replace(/(?:\s+e)?[\s,;(]*$/, '')
    if (!UrlFinal.test(semJuncao)) {
      resto = antes.replace(/[\s(]+$/, '')
      break
    }
    resto = semJuncao
  }
  if (!links.length) return { texto, links }
  const frase = /:$/.test(resto) ? resto : resto.replace(/[.,;!?]+$/, '')
  return { texto: /[\p{L}\p{N}]$/u.test(frase) ? `${frase}:` : frase, links }
}

// Domínio e caminho, sem o www.: "portal.univag.edu.br/financeiro/boletos"
export const rotulo = (link: string) => {
  if (!URL.canParse(link)) return link
  const u = new URL(link)
  return u.hostname.replace(/^www\./, '') + (u.pathname.length > 1 ? u.pathname.replace(/\/$/, '') : '')
}

export function Links({ links }: { links: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {links.map((link) => (
        <Button key={link} asChild variant="outline" size="sm" className="max-w-full rounded-full bg-background">
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

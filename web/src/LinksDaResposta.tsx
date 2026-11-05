import { ExternalLink } from 'lucide-react'
import { Button } from './ui/button'

// Mesma regra de URL do backend (Conferencia.Url), que já recusa a resposta com link fora das fontes citadas.
// O link sai do texto com os dois-pontos e o espaço antes dele; a pontuação final fica ("via: https://x." -> "via.").
export function separarLinks(texto: string) {
  const links: string[] = []
  const limpo = texto.replace(/\s*:?\s*(https?:\/\/[^\s<>()"']+)/gi, (_, url: string) => {
    const link = url.replace(/[.,;:!?]+$/, '')
    if (!links.includes(link)) links.push(link)
    return url.slice(link.length)
  })
  const final = limpo.replace(/\s*\(\s*\)/g, '').replace(/[ \t]+([.,;!?])/g, '$1').trim()
  // o link fechava a resposta sem pontuação: a frase que sobra ganha o ponto final
  const semPonto = /https?:\/\/[^\s<>()"']+$/i.test(texto.trim()) && /[\p{L}\p{N}]$/u.test(final)
  return { texto: semPonto ? `${final}.` : final, links }
}

// Domínio e caminho, sem o www.: "portal.univag.edu.br/financeiro/boletos"
const rotulo = (link: string) => {
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

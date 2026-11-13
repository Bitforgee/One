import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useMatch } from 'react-router'
import { api } from './api'
import CorDaBarra from './corDaBarra.json'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { useTheme } from './ui/theme-provider'
import { useConsulta } from './ui/use-mobile'

export type Imagens = { logo: number | null; icone: number | null; login: number | null; assistente: number | null }
export type Aparencia = {
  nomeCurto: string | null
  cor: string | null
  login: { titulo: string | null; frase: string | null; itens: string[] }
  assistente: { nome: string | null; boasVindas: string | null; perguntas: string[] }
  contato: { horario: string | null; telefone: string | null; email: string | null }
  imagens: Imagens
}
export type InstituicaoPublica = Aparencia & { nome: string }

const Padrao: Aparencia = {
  nomeCurto: null,
  cor: null,
  login: { titulo: null, frase: null, itens: [] },
  assistente: { nome: null, boasVindas: null, perguntas: [] },
  contato: { horario: null, telefone: null, email: null },
  imagens: { logo: null, icone: null, login: null, assistente: null },
}
const mesclar = <T extends object>(base: T, parte?: Partial<T>): T => ({ ...base, ...parte })

export function normalizar(d: Partial<InstituicaoPublica> & { nome: string }): InstituicaoPublica {
  return {
    ...Padrao,
    ...d,
    login: mesclar(Padrao.login, d.login),
    assistente: mesclar(Padrao.assistente, d.assistente),
    contato: mesclar(Padrao.contato, d.contato),
    imagens: mesclar(Padrao.imagens, d.imagens),
  }
}

export const urlDaImagem = (slug: string, tipo: keyof Imagens, versao: number) => `/api/instituicoes/${slug}/imagens/${tipo}?v=${versao}`

export function useInstituicao(slug?: string) {
  return useQuery({ queryKey: ['instituicao', slug], queryFn: () => api<InstituicaoPublica>(`/api/instituicoes/${slug}`), select: normalizar, enabled: !!slug, staleTime: 60_000 })
}

function ponto(seletor: string, tag: 'link' | 'meta', atributos: Record<string, string>, atributo: 'href' | 'content', valor: string | null) {
  let el = document.head.querySelector<HTMLElement>(seletor)
  if (!el) {
    if (valor === null) return
    el = document.createElement(tag)
    for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v)
    document.head.append(el)
  }
  el.dataset.base ??= el.getAttribute(atributo) ?? ''
  const final = valor ?? el.dataset.base
  if (final) el.setAttribute(atributo, final)
  else el.remove()
}

const marcar = (cor?: string | null) => (cor ? document.documentElement.style.setProperty('--marca', cor) : document.documentElement.style.removeProperty('--marca'))

function titular(d?: InstituicaoPublica) {
  const raiz = document.documentElement
  raiz.dataset.titulo ??= document.title
  const nome = d ? (d.nomeCurto ?? d.nome) : raiz.dataset.titulo
  document.title = d && raiz.dataset.rota ? `${raiz.dataset.rota} · ${nome}` : nome
}

function iconeDe(slug: string | undefined, d: InstituicaoPublica | undefined) {
  return slug && d?.imagens.icone ? urlDaImagem(slug, 'icone', d.imagens.icone) : null
}

function manifestoDe(slug: string | undefined) {
  return slug ? `/api/instituicoes/${slug}/manifest.webmanifest` : null
}

function tituloDoApp(slug: string | undefined, d: InstituicaoPublica | undefined) {
  return slug && d ? (d.nomeCurto ?? d.nome) : null
}

function barra(cor: string) {
  let el = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
  if (!el) {
    el = document.createElement('meta')
    el.name = 'theme-color'
    document.head.prepend(el)
  }
  el.content = cor
}

function aplicar(slug: string | undefined, d: InstituicaoPublica | undefined, tema: keyof typeof CorDaBarra) {
  marcar(d?.cor)
  titular(d)
  const icone = iconeDe(slug, d)
  ponto('link[rel="icon"]', 'link', { rel: 'icon', type: 'image/png' }, 'href', icone)
  ponto('link[rel="apple-touch-icon"]', 'link', { rel: 'apple-touch-icon' }, 'href', icone)
  barra(d?.cor ?? CorDaBarra[tema])
  ponto('link[rel="manifest"]', 'link', { rel: 'manifest' }, 'href', manifestoDe(slug))
  ponto('meta[name="apple-mobile-web-app-title"]', 'meta', { name: 'apple-mobile-web-app-title' }, 'content', tituloDoApp(slug, d))
}

export function useRota(titulo: string, d: InstituicaoPublica) {
  useEffect(() => {
    document.documentElement.dataset.rota = titulo
    titular(d)
    return () => {
      delete document.documentElement.dataset.rota
      titular(d)
    }
  }, [titulo, d.nomeCurto, d.nome])
}

export function useAparencia(slug?: string, nome = '') {
  return useInstituicao(slug).data ?? normalizar({ nome })
}

export function AplicaAparencia() {
  const slug = useMatch('/:slug/*')?.params.slug
  const { data } = useInstituicao(slug)
  const { theme } = useTheme()
  const sistemaEscuro = useConsulta('(prefers-color-scheme: dark)')
  const tema = theme === 'system' ? (sistemaEscuro ? 'dark' : 'light') : theme
  useEffect(() => aplicar(slug, data, tema), [slug, data, tema])
  return null
}

export function contraste(hex: string) {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 1.05 / (0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5) + 0.05)
}
export const CorValida = /^#[0-9a-fA-F]{6}$/
export const MinimoDeContraste = 4.5

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

export function Sigla({ slug, nome, icone, className = 'size-8' }: { slug?: string; nome: string; icone: number | null; className?: string }) {
  if (slug && icone) return <img src={urlDaImagem(slug, 'icone', icone)} alt="" width={32} height={32} className={`${className} shrink-0 rounded-sm object-cover`} />
  return (
    <span aria-hidden="true" className={`${className} flex shrink-0 items-center justify-center rounded-sm bg-primary text-xs font-bold text-primary-foreground`}>
      {iniciais(nome)}
    </span>
  )
}

export const temContato = (c: Aparencia['contato']) => !!(c.horario || c.telefone || c.email)

export function Contato({ contato }: { contato: Aparencia['contato'] }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      {contato.horario && <p className="m-0">{contato.horario}</p>}
      {contato.telefone && (
        <a href={`tel:${contato.telefone.replace(/\D/g, '')}`} translate="no" className="text-primary">
          {contato.telefone}
        </a>
      )}
      {contato.email && (
        <a href={`mailto:${contato.email}`} translate="no" className="text-primary [overflow-wrap:anywhere]">
          {contato.email}
        </a>
      )}
    </div>
  )
}

export function DialogoDeContato({ contato, aberto, aoMudar }: { contato: Aparencia['contato']; aberto: boolean; aoMudar: (aberto: boolean) => void }) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Contato do atendimento</DialogTitle>
        </DialogHeader>
        <Contato contato={contato} />
      </DialogContent>
    </Dialog>
  )
}

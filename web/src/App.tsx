import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { useState } from 'react'
import { Route, Routes } from 'react-router'
import { DefinirSenha, Login, PrimeiroAcesso, Raiz, TrocarSenha } from './acesso/Acesso'
import { Conta } from './acesso/Conta'
import { AplicaAparencia } from './aparencia'
import { Aparencia } from './administracao/Aparencia'
import { Cadastros } from './administracao/Cadastros'
import { Instituicoes } from './administracao/Instituicoes'
import { Matriculas } from './administracao/Matriculas'
import { Usuarios } from './administracao/Usuarios'
import { Assistente } from './assistente/Assistente'
import { Autenticado } from './Autenticado'
import { ChamadoDetalhe } from './chamados/ChamadoDetalhe'
import { Fila, Solicitacoes } from './chamados/Chamados'
import { Artigos } from './conhecimento/Artigos'
import { Documentos } from './conhecimento/Documentos'
import { Indicadores } from './indicadores/Indicadores'
import { Toaster } from './ui/sonner'
import { ThemeProvider } from './ui/theme-provider'

// Um cliente por montagem: o cache não passa de um teste para outro (door 7).
function novoCliente() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
}

export function App() {
  const [cliente] = useState(novoCliente)
  return (
    <QueryClientProvider client={cliente}>
      <ThemeProvider defaultTheme="system" storageKey="one-tema">
        <MotionConfig reducedMotion="user">
          <Rotas />
          <Toaster containerAriaLabel="Notificações" />
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

function Rotas() {
  return (
    <>
      <AplicaAparencia />
      <Routes>
        <Route path="/" element={<Raiz />} />
        <Route path="/:slug">
          <Route index element={<Login />} />
          <Route path="primeiro-acesso" element={<PrimeiroAcesso />} />
          <Route path="definir-senha" element={<DefinirSenha />} />
          <Route element={<Autenticado />}>
            <Route path="trocar-senha" element={<TrocarSenha />} />
            <Route path="assistente" element={<Assistente />} />
            <Route path="conta" element={<Conta />} />
            <Route path="solicitacoes" element={<Solicitacoes />} />
            <Route path="chamados/:numero" element={<ChamadoDetalhe />} />
            <Route path="fila" element={<Fila />} />
            <Route path="artigos" element={<Artigos />} />
            <Route path="documentos" element={<Documentos />} />
            <Route path="indicadores" element={<Indicadores />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="matriculas" element={<Matriculas />} />
            <Route path="cadastros" element={<Cadastros />} />
            <Route path="aparencia" element={<Aparencia />} />
            <Route path="instituicoes" element={<Instituicoes />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}

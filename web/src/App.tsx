import { Container } from 'react-bootstrap'
import { Route, Routes } from 'react-router'
import { Artigos, Indicadores } from './telas/Equipe'
import { ChamadoDetalhe, Fila, Solicitacoes } from './telas/Chamados'
import { Assistente } from './telas/Assistente'
import { Autenticado } from './telas/Autenticado'
import { DefinirSenha, Login, PrimeiroAcesso, TrocarSenha } from './telas/Acesso'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Container className="py-5">Abra o endereço da sua instituição, por exemplo /univag.</Container>} />
      <Route path="/:slug">
        <Route index element={<Login />} />
        <Route path="primeiro-acesso" element={<PrimeiroAcesso />} />
        <Route path="definir-senha" element={<DefinirSenha />} />
        <Route element={<Autenticado />}>
          <Route path="trocar-senha" element={<TrocarSenha />} />
          <Route path="assistente" element={<Assistente />} />
          <Route path="solicitacoes" element={<Solicitacoes />} />
          <Route path="chamados/:numero" element={<ChamadoDetalhe />} />
          <Route path="fila" element={<Fila />} />
          <Route path="artigos" element={<Artigos />} />
          <Route path="indicadores" element={<Indicadores />} />
        </Route>
      </Route>
    </Routes>
  )
}

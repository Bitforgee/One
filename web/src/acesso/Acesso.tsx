import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { useForm, type FieldValues, type Path, type Resolver, type UseFormReturn } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { BotaoAcao } from '../acao'
import { api } from '../api'
import { telaInicial, useSessao } from '../sessao'
import { Alert } from '../ui/alert'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'

// Só o que a tela já exigia (campo preenchido); o resto, quem decide é a API (AC 39, AC 40).
const obrigatorio = z.string().min(1)

// Área de acesso do bloco de login do shadcn: cartão de até 384 px no centro da janela.
export function Centro({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

const Itens = ['Tire dúvidas com o assistente a qualquer hora', 'Acompanhe suas solicitações até a resposta', 'Fale com a equipe da instituição quando precisar']

// Duas colunas a partir de 1024 px: o formulário à esquerda, alinhado à esquerda; à direita um painel neutro só com texto, sem ícones nem degradê.
function Entrada({ titulo, descricao, children }: { titulo: ReactNode; descricao?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="text-lg leading-6 font-bold tracking-tight">One</div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-xs flex-col gap-6">
            <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
            {descricao && <p className="-mt-5 text-sm text-muted-foreground">{descricao}</p>}
            {children}
          </div>
        </div>
      </div>
      <div className="relative hidden flex-col border-l bg-muted p-10 lg:flex">
        <div className="mt-auto max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">Atendimento ao estudante</h2>
          <p className="mt-2 text-muted-foreground">Dúvidas, solicitações e respostas da sua instituição em um só lugar.</p>
          <ul className="mt-6 border-t">
            {Itens.map((texto) => (
              <li key={texto} className="border-b py-3">
                {texto}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

type Props<T extends FieldValues> = { f: UseFormReturn<T>; nome: Path<T>; rotulo: string; dica?: string } & ComponentProps<'input'>

function Campo<T extends FieldValues>({ f, nome, rotulo, dica, ...props }: Props<T>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={nome}>{rotulo}</Label>
      <Input id={nome} aria-invalid={!!f.formState.errors[nome]} {...props} {...f.register(nome)} />
      {dica && <p className="text-sm text-muted-foreground">{dica}</p>}
    </div>
  )
}

// Formulário de um envio só: Zod pelo RHF, a mutação em volta de api() e o erro da API num Alert.
function Formulario<T extends FieldValues>({ schema, enviar, botao, className, children }: {
  schema: z.ZodType<T>
  enviar: (v: T) => Promise<unknown>
  botao: string
  className?: string
  children: (form: UseFormReturn<T>) => ReactNode
}) {
  const form = useForm<T>({ resolver: zodResolver(schema as never) as Resolver<T> })
  const m = useMutation({ mutationFn: enviar })
  return (
    <>
      <form noValidate onSubmit={form.handleSubmit((v) => m.mutate(v))} className="flex flex-col gap-6">
        {children(form)}
        <BotaoAcao type="submit" pendente={m.isPending} className={className}>
          {botao}
        </BotaoAcao>
      </form>
      {m.error && <Alert variant="destructive">{m.error.message}</Alert>}
    </>
  )
}

const schemaLogin = z.object({ cpf: obrigatorio, senha: obrigatorio })

export function Login() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { data: instituicao, isError, isPending } = useQuery({ queryKey: ['instituicao', slug], queryFn: () => api<{ nome: string }>(`/api/instituicoes/${slug}`) })

  if (isError)
    return (
      <Centro>
        <Alert>Instituição não encontrada.</Alert>
      </Centro>
    )
  if (isPending)
    return (
      <Centro>
        <Spinner className="mx-auto size-8" />
      </Centro>
    )

  return (
    <Entrada titulo={instituicao.nome} descricao="Entre com seu CPF e sua senha.">
      <Formulario
        schema={schemaLogin}
        botao="Entrar"
        className="w-full"
        enviar={async (v) => {
          const u = await api<{ papeis: string[]; deveTrocarSenha: boolean }>('/api/auth/login', { instituicao: slug, ...v })
          navigate(`/${slug}/${telaInicial(u)}`)
        }}
      >
        {(form) => (
          <>
            <Campo f={form} nome="cpf" rotulo="CPF" inputMode="numeric" autoComplete="username" />
            <Campo f={form} nome="senha" rotulo="Senha" type="password" autoComplete="current-password" />
          </>
        )}
      </Formulario>
      <Link to={`/${slug}/primeiro-acesso`} className="self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Primeiro acesso ou esqueci minha senha
      </Link>
    </Entrada>
  )
}

export function PrimeiroAcesso() {
  const { slug } = useParams()
  const [mensagem, setMensagem] = useState<string>()
  return (
    <Entrada titulo="Primeiro acesso">
      {mensagem ? (
        <Alert>{mensagem}</Alert>
      ) : (
        <Formulario
          schema={z.object({ cpf: obrigatorio })}
          botao="Enviar link"
          className="w-full"
          enviar={async (v) => setMensagem((await api<{ mensagem: string }>('/api/auth/primeiro-acesso', { instituicao: slug, ...v })).mensagem)}
        >
          {(form) => <Campo f={form} nome="cpf" rotulo="CPF" inputMode="numeric" dica="Enviaremos um link para criar a senha no e-mail registrado na instituição." />}
        </Formulario>
      )}
      <Link to={`/${slug}`} className="self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Voltar para o login
      </Link>
    </Entrada>
  )
}

export function DefinirSenha() {
  const { slug } = useParams()
  const [busca] = useSearchParams()
  const [pronto, setPronto] = useState(false)
  return (
    <Entrada titulo="Criar senha">
      {pronto ? (
        <Alert>
          Senha criada. <Link to={`/${slug}`}>Entre com o CPF e a nova senha.</Link>
        </Alert>
      ) : (
        <Formulario
          schema={z.object({ novaSenha: obrigatorio })}
          botao="Salvar senha"
          className="w-full"
          enviar={async (v) => {
            await api('/api/auth/definir-senha', { token: busca.get('token'), ...v })
            setPronto(true)
          }}
        >
          {(form) => <Campo f={form} nome="novaSenha" rotulo="Nova senha" type="password" autoComplete="new-password" dica="De 8 a 128 caracteres." />}
        </Formulario>
      )}
    </Entrada>
  )
}

export function TrocarSenha() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { me, setMe } = useSessao()
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      {me.deveTrocarSenha && <Alert>Troque a senha temporária para continuar.</Alert>}
      <Formulario
        schema={z.object({ senhaAtual: obrigatorio, novaSenha: obrigatorio })}
        botao="Salvar"
        enviar={async (v) => {
          await api('/api/auth/senha', v)
          const atualizado = { ...me, deveTrocarSenha: false }
          setMe(atualizado)
          navigate(`/${slug}/${telaInicial(atualizado)}`)
        }}
      >
        {(form) => (
          <>
            <Campo f={form} nome="senhaAtual" rotulo="Senha atual" type="password" autoComplete="current-password" />
            <Campo f={form} nome="novaSenha" rotulo="Nova senha" type="password" autoComplete="new-password" dica="De 8 a 128 caracteres." />
          </>
        )}
      </Formulario>
    </div>
  )
}

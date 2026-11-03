namespace One.Api.Dados;

public interface  IDaInstituicao
{
    long InstituicaoId { get; set; }
}

public static class Papeis
{
    public const string Aluno = "ALUNO";
    public const string Atendente = "ATENDENTE";
    public const string Administrador = "ADMINISTRADOR";
}

public static class EstadosArtigo
{
    public const string Rascunho = "RASCUNHO";
    public const string Ativo = "ATIVO";
    public const string Arquivado = "ARQUIVADO";
}

public static class Desfechos
{
    public const string Resolvida = "RESOLVIDA_AUTOATENDIMENTO";
    public const string Transferida = "TRANSFERIDA";
    public const string Encerrada = "ENCERRADA_PELO_ALUNO";
    public const string Abandonada = "ABANDONADA";
}

public static class EstadosDocumento
{
    public const string Ativo = "ATIVO";
    public const string Arquivado = "ARQUIVADO";
}

public static class EstadosChamado
{
    public const string Aberto = "ABERTO";
    public const string EmAtendimento = "EM_ATENDIMENTO";
    public const string AguardandoAluno = "AGUARDANDO_ALUNO";
    public const string Resolvido = "RESOLVIDO";
    public const string Fechado = "FECHADO";
}

public static class TiposEvento
{
    public const string Criacao = "CRIACAO";
    public const string Transicao = "TRANSICAO";
    public const string Atribuicao = "ATRIBUICAO";
    public const string Lembrete = "LEMBRETE";
    public const string Nota = "NOTA";
    public const string Resposta = "RESPOSTA";
    public const string Anexo = "ANEXO";
    public const string Encaminhamento = "ENCAMINHAMENTO";
    public const string Reclassificacao = "RECLASSIFICACAO";
}

public static class TiposMensagem
{
    public const string Publica = "PUBLICA";
    public const string Nota = "NOTA";
}

public static class MotivosFechamento
{
    public const string Confirmado = "CONFIRMADO";
    public const string Cancelado = "CANCELADO";
    public const string Duplicado = "DUPLICADO";
    public const string FechadoAutomaticamente = "FECHADO_AUTOMATICAMENTE";
}

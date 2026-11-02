namespace One.Api.Dados;

public interface  IDaInstituicao
{
    long InstituicaoId { get; set; }
}

public class Instituicao
{
    public long Id { get; set; }
    public string Slug { get; set; } = "";
    public string Nome { get; set; } = "";
    public string Fuso { get; set; } = "";
    public bool Ativa { get; set; } = true;
    public DateTime CriadaEm { get; set; }
    public long UltimoNumeroChamado { get; set; } // door 5: incrementado com UPDATE ... RETURNING
}

public static class Papeis
{
    public const string Aluno = "ALUNO";
    public const string Atendente = "ATENDENTE";
    public const string Administrador = "ADMINISTRADOR";
}

public class Usuario : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Cpf { get; set; } = "";
    public string Nome { get; set; } = "";
    public string Email { get; set; } = "";
    public string? SenhaHash { get; set; }
    public bool DeveTrocarSenha { get; set; }
    public bool Ativo { get; set; } = true;
    public List<UsuarioPapel> Papeis { get; set; } = [];
    public List<Matricula> Matriculas { get; set; } = [];

    public bool Tem(string papel) => Papeis.Any(p => p.Papel == papel);
}

public class UsuarioPapel : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; set; }
    public string Papel { get; set; } = "";
}

public class Setor : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Nome { get; set; } = "";
    public bool Triagem { get; set; }
    public bool Ativo { get; set; } = true;
}

public class AtendenteSetor : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; set; }
    public long SetorId { get; set; }
}

public class Curso : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Nome { get; set; } = "";
    public long? SetorCoordenacaoId { get; set; }
}

public class Matricula : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; set; }
    public long CursoId { get; set; }
    public Curso? Curso { get; set; }
    public string Numero { get; set; } = "";
    public int Semestre { get; set; }
    public string Situacao { get; set; } = "ATIVA";
}

public class Categoria : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Nome { get; set; } = "";
    public bool Ativa { get; set; } = true;
    public bool Padrao { get; set; }
}

public class RegraRoteamento : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long CategoriaId { get; set; }
    public string Destino { get; set; } = ""; // SETOR ou COORDENACAO_CURSO
    public long? SetorId { get; set; }
}

public static class EstadosArtigo
{
    public const string Rascunho = "RASCUNHO";
    public const string Ativo = "ATIVO";
    public const string Arquivado = "ARQUIVADO";
}

public class Artigo : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long CategoriaId { get; set; }
    public string Estado { get; set; } = EstadosArtigo.Rascunho;
    public List<VersaoArtigo> Versoes { get; set; } = [];
}

public class VersaoArtigo : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long ArtigoId { get; set; }
    public Artigo? Artigo { get; set; }
    public int Numero { get; set; }
    public string Titulo { get; set; } = "";
    public List<string> Perguntas { get; set; } = [];
    public string Resposta { get; set; } = "";
    public List<string> Links { get; set; } = [];
    public DateTime CriadaEm { get; set; }
}

public class TokenAcesso : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; set; }
    public string Hash { get; set; } = "";
    public DateTime CriadoEm { get; set; }
    public DateTime ExpiraEm { get; set; }
    public DateTime? UsadoEm { get; set; }
}

public static class Desfechos
{
    public const string Resolvida = "RESOLVIDA_AUTOATENDIMENTO";
    public const string Transferida = "TRANSFERIDA";
    public const string Encerrada = "ENCERRADA_PELO_ALUNO";
    public const string Abandonada = "ABANDONADA";
}

public class Conversa : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long AlunoId { get; set; }
    public DateTime CriadaEm { get; set; }
    public DateTime UltimaMensagemEm { get; set; }
    public string? Desfecho { get; set; }
    public DateTime? DesfechoEm { get; set; }
    public List<MensagemConversa> Mensagens { get; set; } = [];
}

public class MensagemConversa : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long ConversaId { get; set; }
    public string Autor { get; set; } = ""; // ALUNO ou ASSISTENTE
    public string Texto { get; set; } = ""; // texto exato exibido
    public string? TipoDevolvido { get; set; }
    public string? TipoFinal { get; set; }
    public string? Modelo { get; set; }
    public long? CategoriaIdSugerida { get; set; }
    public string? Resumo { get; set; }
    public DateTime CriadaEm { get; set; }
    public List<CitacaoArtigo> Citacoes { get; set; } = [];
}

public class CitacaoArtigo : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long MensagemConversaId { get; set; }
    public long VersaoArtigoId { get; set; }
    public List<string> Trechos { get; set; } = [];
}

public static class EstadosChamado
{
    public const string Aberto = "ABERTO";
    public const string EmAtendimento = "EM_ATENDIMENTO";
    public const string AguardandoAluno = "AGUARDANDO_ALUNO";
    public const string Resolvido = "RESOLVIDO";
    public const string Fechado = "FECHADO";
}

public class Chamado : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Numero { get; set; } = "";
    public long ConversaId { get; set; }
    public long SolicitanteId { get; set; }
    public long MatriculaId { get; set; }
    public int Semestre { get; set; } // semestre da matrícula na transferência (AC 59)
    public string Titulo { get; set; } = "";
    public string? Resumo { get; set; }
    public long CategoriaId { get; set; }
    public long CategoriaOriginalId { get; set; }
    public string OrigemCategoria { get; set; } = ""; // IA, ARTIGO ou PADRAO
    public long SetorId { get; set; }
    public long? ResponsavelId { get; set; }
    public string Estado { get; set; } = EstadosChamado.Aberto;
    public string? MotivoFechamento { get; set; } // CONFIRMADO, CANCELADO, FECHADO_AUTOMATICAMENTE, DUPLICADO
    public int Reaberturas { get; set; }
    public int Encaminhamentos { get; set; }
    public DateTime CriadoEm { get; set; }
    public DateTime? ResolvidoEm { get; set; }
    public DateTime? FechadoEm { get; set; }
    public uint Xmin { get; set; } // door 14: coluna de sistema do PostgreSQL como token de concorrência
}

public class MensagemChamado : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long ChamadoId { get; set; }
    public long? AutorId { get; set; }
    public string Tipo { get; set; } = ""; // PUBLICA ou NOTA
    public string Texto { get; set; } = "";
    public DateTime CriadaEm { get; set; }
}

public class Anexo : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long MensagemChamadoId { get; set; }
}

public class EventoChamado : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long ChamadoId { get; set; }
    public string Tipo { get; set; } = ""; // CRIACAO, TRANSICAO, ATRIBUICAO, ENCAMINHAMENTO, RECLASSIFICACAO, RESPOSTA, NOTA, ANEXO
    public long? AtorId { get; set; } // vazio = Sistema
    public string? De { get; set; }
    public string? Para { get; set; }
    public string? Detalhe { get; set; }
    public DateTime CriadoEm { get; set; }
}

public class RespostaPronta : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long SetorId { get; set; }
    public string Titulo { get; set; } = "";
    public string Texto { get; set; } = "";
}

public class EmailSaida : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Destinatario { get; set; } = "";
    public string Assunto { get; set; } = "";
    public string Corpo { get; set; } = "";
    public int Tentativas { get; set; }
    public DateTime ProximaTentativa { get; set; }
    public DateTime? EnviadoEm { get; set; }
}

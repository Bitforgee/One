namespace One.Api.Dados.Conversas;

public class MensagemConversa : IDaInstituicao
{
    public const string AutorAluno = "ALUNO";
    public const string AutorAssistente = "ASSISTENTE";

    MensagemConversa() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long ConversaId { get; private set; }
    public string Autor { get; private set; } = "";
    public string Texto { get; private set; } = "";
    public string? TipoDevolvido { get; private set; }
    public string? TipoFinal { get; private set; }
    public string? Modelo { get; private set; }
    public long? CategoriaIdSugerida { get; private set; }
    public string? Resumo { get; private set; }
    public DateTime CriadaEm { get; private set; }
    public List<CitacaoArtigo> Citacoes { get; private set; } = [];
    public List<AnexoConversa> Anexos { get; private set; } = [];
    public List<long>? TrechosBuscados { get; private set; }

    public sealed record RespostaDoAssistente
    {
        public required string Texto { get; init; }
        public required string TipoFinal { get; init; }
        public required DateTime CriadaEm { get; init; }
        public string? TipoDevolvido { get; init; }
        public string? Modelo { get; init; }
        public long? CategoriaIdSugerida { get; init; }
        public string? Resumo { get; init; }
        public List<CitacaoArtigo> Citacoes { get; init; } = [];
        public List<long>? TrechosBuscados { get; init; }
    }

    public static MensagemConversa DoAluno(string texto, List<AnexoConversa> anexos, DateTime agora) =>
        new() { Autor = AutorAluno, Texto = texto, CriadaEm = agora, Anexos = anexos };

    public static MensagemConversa DoAssistente(RespostaDoAssistente r) => new()
    {
        Autor = AutorAssistente, Texto = r.Texto, TipoDevolvido = r.TipoDevolvido, TipoFinal = r.TipoFinal, Modelo = r.Modelo,
        CategoriaIdSugerida = r.CategoriaIdSugerida, Resumo = r.Resumo, CriadaEm = r.CriadaEm, Citacoes = r.Citacoes, TrechosBuscados = r.TrechosBuscados,
    };
}
namespace One.Api.Dados.Conversas;

public class MensagemConversa : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long ConversaId { get; set; }
    public string Autor { get; set; } = "";
    public string Texto { get; set; } = "";
    public string? TipoDevolvido { get; set; }
    public string? TipoFinal { get; set; }
    public string? Modelo { get; set; }
    public long? CategoriaIdSugerida { get; set; }
    public string? Resumo { get; set; }
    public DateTime CriadaEm { get; set; }
    public List<CitacaoArtigo> Citacoes { get; set; } = [];
    public List<AnexoConversa> Anexos { get; set; } = [];
    public List<long>? TrechosBuscados { get; set; }
}

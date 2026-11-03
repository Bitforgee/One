namespace One.Api.Dados.Conversas;

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
    public List<long>? TrechosBuscados { get; set; } // RAG, door R5: ids de trecho_fonte em ordem de distância
}

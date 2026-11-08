namespace One.Api.Dados.Artigos;

public class VersaoArtigo : IDaInstituicao
{
    public long Id { get; init; }
    public long InstituicaoId { get; set; }
    public long ArtigoId { get; init; }
    public Artigo? Artigo { get; init; }
    public int Numero { get; init; }
    public string Titulo { get; init; } = "";
    public List<string> Perguntas { get; init; } = [];
    public string Resposta { get; init; } = "";
    public List<string> Links { get; init; } = [];
    public DateTime CriadaEm { get; init; }
}

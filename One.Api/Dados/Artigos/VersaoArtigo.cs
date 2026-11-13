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

    public sealed record Dados(string Titulo, IEnumerable<string> Perguntas, string Resposta, IEnumerable<string>? Links);

    public static VersaoArtigo Criar(Dados dados, int numero, DateTime agora) => new()
    {
        Numero = numero,
        Titulo = dados.Titulo,
        Perguntas = [.. dados.Perguntas.Where(p => !string.IsNullOrWhiteSpace(p))],
        Resposta = dados.Resposta,
        Links = [.. dados.Links ?? []],
        CriadaEm = agora,
    };

    public string TextoParaBusca() => $"{Titulo}\n{string.Join("\n", Perguntas)}\n{Resposta}";
}

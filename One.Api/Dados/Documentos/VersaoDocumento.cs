namespace One.Api.Dados.Documentos;

public class VersaoDocumento : IDaInstituicao
{
    public long Id { get; init; }
    public long InstituicaoId { get; set; }
    public long DocumentoId { get; init; }
    public Documento? Documento { get; init; }
    public int Numero { get; init; }
    public string NomeArquivo { get; init; } = "";
    public string Chave { get; init; } = "";
    public string Hash { get; init; } = "";
    public long Tamanho { get; init; }
    public string Texto { get; init; } = "";
    public int Paginas { get; init; }
    public DateTime CriadaEm { get; init; }

    public sealed record Arquivo(string NomeArquivo, string Chave, string Hash, long Tamanho);

    public static VersaoDocumento Criar(Arquivo arquivo, string texto, int paginas, int numero, DateTime agora) => new()
    {
        Numero = numero, NomeArquivo = arquivo.NomeArquivo, Chave = arquivo.Chave, Hash = arquivo.Hash, Tamanho = arquivo.Tamanho,
        Texto = texto, Paginas = paginas, CriadaEm = agora,
    };
}

namespace One.Api.Dados.Documentos;

public class VersaoDocumento : IDaInstituicao
{
    public long Id { get; init; }
    public long InstituicaoId { get; set; }
    public long DocumentoId { get; init; }
    public Documento? Documento { get; init; }
    public int Numero { get; init; }
    public string NomeArquivo { get; init; } = "";
    public byte[] Conteudo { get; init; } = [];
    public string Texto { get; init; } = "";
    public int Paginas { get; init; }
    public DateTime CriadaEm { get; init; }
}

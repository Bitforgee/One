using Pgvector;

namespace One.Api.Dados.Trechos;

public class TrechoFonte : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long? VersaoArtigoId { get; set; }
    public VersaoArtigo? VersaoArtigo { get; set; }
    public long? VersaoDocumentoId { get; set; }
    public VersaoDocumento? VersaoDocumento { get; set; }
    public int Ordem { get; set; }
    public string Texto { get; set; } = "";
    public Vector? Embedding { get; set; }
    public int Tentativas { get; set; }
    public DateTime ProximaTentativa { get; set; }
}

using System.Linq.Expressions;
using Pgvector;

namespace One.Api.Dados.Trechos;

public class TrechoFonte : IDaInstituicao
{
    TrechoFonte() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long? VersaoArtigoId { get; private set; }
    public VersaoArtigo? VersaoArtigo { get; private set; }
    public long? VersaoDocumentoId { get; private set; }
    public VersaoDocumento? VersaoDocumento { get; private set; }
    public int Ordem { get; private set; }
    public string Texto { get; private set; } = "";
    public Vector? Embedding { get; private set; }
    public int Tentativas { get; private set; }
    public DateTime ProximaTentativa { get; private set; }

    public static readonly Expression<Func<TrechoFonte, bool>> SemEmbedding = t => t.Embedding == null;

    public static TrechoFonte DoArtigo(VersaoArtigo versao, DateTime agora, Vector? embedding = null) =>
        new() { VersaoArtigo = versao, Ordem = 0, Texto = versao.TextoParaBusca(), ProximaTentativa = agora, Embedding = embedding };

    public static TrechoFonte DoDocumento(VersaoDocumento versao, int ordem, string texto, DateTime agora, Vector? embedding = null) =>
        new() { VersaoDocumento = versao, Ordem = ordem, Texto = texto, ProximaTentativa = agora, Embedding = embedding };

    public static TrechoFonte DaVersaoDeArtigo(long versaoArtigoId, int ordem, string texto, DateTime proximaTentativa, Vector? embedding = null) =>
        new() { VersaoArtigoId = versaoArtigoId, Ordem = ordem, Texto = texto, ProximaTentativa = proximaTentativa, Embedding = embedding };

    public static TrechoFonte DaVersaoDeDocumento(long versaoDocumentoId, int ordem, string texto, DateTime proximaTentativa, Vector? embedding = null) =>
        new() { VersaoDocumentoId = versaoDocumentoId, Ordem = ordem, Texto = texto, ProximaTentativa = proximaTentativa, Embedding = embedding };
}

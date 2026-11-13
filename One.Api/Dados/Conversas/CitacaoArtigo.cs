namespace One.Api.Dados.Conversas;

public class CitacaoArtigo : IDaInstituicao
{
    CitacaoArtigo() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long MensagemConversaId { get; private set; }
    public long? VersaoArtigoId { get; private set; }
    public long? TrechoFonteId { get; private set; }
    public List<string> Trechos { get; private set; } = [];

    public static CitacaoArtigo DoTrecho(long trechoFonteId, List<string> trechos) => new() { TrechoFonteId = trechoFonteId, Trechos = trechos };

    public static CitacaoArtigo DaVersao(long versaoArtigoId, List<string> trechos) => new() { VersaoArtigoId = versaoArtigoId, Trechos = trechos };
}

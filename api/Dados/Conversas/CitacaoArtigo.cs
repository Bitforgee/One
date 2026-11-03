namespace One.Api.Dados.Conversas;

public class CitacaoArtigo : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long MensagemConversaId { get; set; }
    public long? VersaoArtigoId { get; set; }
    public long? TrechoFonteId { get; set; }
    public List<string> Trechos { get; set; } = [];
}

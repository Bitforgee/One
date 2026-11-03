namespace One.Api.Dados.Conversas;

public class CitacaoArtigo : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long MensagemConversaId { get; set; }
    public long? VersaoArtigoId { get; set; } // só nas citações anteriores ao RAG
    public long? TrechoFonteId { get; set; } // RAG, door R5
    public List<string> Trechos { get; set; } = [];
}

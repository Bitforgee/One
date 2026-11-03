namespace One.Api.Dados.Chamados;

public class EventoChamado : IDaInstituicao
{
    public long Id { get; init; }
    public long InstituicaoId { get; set; }
    public long ChamadoId { get; init; }
    public string Tipo { get; init; } = ""; // CRIACAO, TRANSICAO, ATRIBUICAO, ENCAMINHAMENTO, RECLASSIFICACAO, RESPOSTA, NOTA, ANEXO
    public long? AtorId { get; init; } // vazio = Sistema
    public string? De { get; init; }
    public string? Para { get; init; }
    public string? Detalhe { get; init; }
    public DateTime CriadoEm { get; init; }
}

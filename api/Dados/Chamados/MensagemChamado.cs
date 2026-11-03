namespace One.Api.Dados.Chamados;

public class MensagemChamado : IDaInstituicao
{
    public long Id { get; init; }
    public long InstituicaoId { get; set; }
    public long ChamadoId { get; init; }
    public long? AutorId { get; init; }
    public string Tipo { get; init; } = ""; // PUBLICA ou NOTA
    public string Texto { get; init; } = "";
    public DateTime CriadaEm { get; init; }
    public List<Anexo> Anexos { get; init; } = [];
}

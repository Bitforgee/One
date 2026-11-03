namespace One.Api.Dados.Chamados;

public class Anexo : IDaInstituicao
{
    public long Id { get; init; }
    public long InstituicaoId { get; set; }
    public long MensagemChamadoId { get; init; }
    public string Nome { get; init; } = "";
    public string Tipo { get; init; } = "";
    public long Tamanho { get; init; }
    public byte[] Conteudo { get; init; } = [];
}

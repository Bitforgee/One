namespace One.Api.Dados.Conversas;

public class Conversa : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long AlunoId { get; set; }
    public DateTime CriadaEm { get; set; }
    public DateTime UltimaMensagemEm { get; set; }
    public string? Desfecho { get; set; }
    public DateTime? DesfechoEm { get; set; }
    public List<MensagemConversa> Mensagens { get; set; } = [];
}

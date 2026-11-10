namespace One.Api.Dados.Moodle;

public class LtiLancamento : IDaInstituicao
{
    public static readonly TimeSpan Validade = TimeSpan.FromMinutes(10);

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public string State { get; private set; } = "";
    public string Nonce { get; private set; } = "";
    public DateTime ExpiraEm { get; private set; }
    public DateTime? UsadoEm { get; private set; }

    public static LtiLancamento Abrir(string state, string nonce, DateTime agora) =>
        new() { State = state, Nonce = nonce, ExpiraEm = agora + Validade };
}

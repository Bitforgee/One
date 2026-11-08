namespace One.Api.Dados.Emails;

public class EmailSaida : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Destinatario { get; set; } = "";
    public string Assunto { get; set; } = "";
    public string Corpo { get; set; } = "";
    public int Tentativas { get; set; }
    public DateTime ProximaTentativa { get; set; }
    public DateTime? EnviadoEm { get; set; }
}

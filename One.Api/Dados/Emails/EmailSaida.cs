namespace One.Api.Dados.Emails;

public class EmailSaida : IDaInstituicao
{
    EmailSaida() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public string Destinatario { get; private set; } = "";
    public string Assunto { get; private set; } = "";
    public string Corpo { get; private set; } = "";
    public int Tentativas { get; private set; }
    public DateTime ProximaTentativa { get; private set; }
    public DateTime? EnviadoEm { get; private set; }

    public static EmailSaida Criar(string destinatario, string assunto, string corpo, DateTime agora) =>
        new() { Destinatario = destinatario, Assunto = assunto, Corpo = corpo, ProximaTentativa = agora };

    public void RegistrarFalha(DateTime agora)
    {
        Tentativas++;
        ProximaTentativa = agora.AddMinutes(Math.Pow(2, Tentativas));
    }

    public void Concluir(DateTime agora) => EnviadoEm = agora;
}
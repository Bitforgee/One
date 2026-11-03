namespace One.Api.Dados.Push;

public class PushSaida : IDaInstituicao
{
    PushSaida() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long SubscricaoId { get; private set; }
    public long ChamadoId { get; private set; }
    public int Tentativas { get; private set; }
    public DateTime ProximaTentativa { get; private set; }
    public DateTime? EnviadoEm { get; private set; }

    public static PushSaida Criar(long subscricaoId, long chamadoId, DateTime agora) =>
        new() { SubscricaoId = subscricaoId, ChamadoId = chamadoId, ProximaTentativa = agora };

    public void RegistrarFalha(DateTime agora)
    {
        Tentativas++;
        ProximaTentativa = agora.AddMinutes(Math.Pow(2, Tentativas));
    }

    public void Concluir(DateTime agora) => EnviadoEm = agora;
}

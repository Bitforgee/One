namespace One.Api.Dados.Push;

public class SubscricaoPush : IDaInstituicao
{
    SubscricaoPush() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; private set; }
    public string Endpoint { get; private set; } = "";
    public string P256dh { get; private set; } = "";
    public string Auth { get; private set; } = "";
    public DateTime RegistradaEm { get; private set; }

    public static SubscricaoPush Registrar(long usuarioId, long instituicaoId, string endpoint, string p256dh, string auth, DateTime agora) =>
        new() { UsuarioId = usuarioId, InstituicaoId = instituicaoId, Endpoint = endpoint, P256dh = p256dh, Auth = auth, RegistradaEm = agora };

    public void Reatribuir(long usuarioId, long instituicaoId, string p256dh, string auth, DateTime agora) =>
        (UsuarioId, InstituicaoId, P256dh, Auth, RegistradaEm) = (usuarioId, instituicaoId, p256dh, auth, agora);
}

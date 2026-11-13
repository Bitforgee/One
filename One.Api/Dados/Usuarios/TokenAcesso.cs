namespace One.Api.Dados.Usuarios;

public class TokenAcesso : IDaInstituicao
{
    TokenAcesso() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; private set; }
    public string Hash { get; private set; } = "";
    public DateTime CriadoEm { get; private set; }
    public DateTime ExpiraEm { get; private set; }
    public DateTime? UsadoEm { get; private set; }

    public static TokenAcesso Criar(long usuarioId, string hash, DateTime agora, TimeSpan validade) =>
        new() { UsuarioId = usuarioId, Hash = hash, CriadoEm = agora, ExpiraEm = agora + validade };

    public bool Valido(DateTime agora) => UsadoEm is null && ExpiraEm > agora;

    public void Usar(DateTime agora) => UsadoEm = agora;
}
namespace One.Api.Dados.Usuarios;

public class UsuarioPapel : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; set; }
    public string Papel { get; set; } = "";
}

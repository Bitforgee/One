namespace One.Api.Dados.Usuarios;

public class UsuarioPapel : IDaInstituicao
{
    UsuarioPapel() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; private set; }
    public string Papel { get; private set; } = "";

    internal static UsuarioPapel Criar(string papel) => new() { Papel = papel };
}

namespace One.Api.Dados.Usuarios;

public class AtendenteSetor : IDaInstituicao
{
    AtendenteSetor() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; private set; }
    public long SetorId { get; private set; }

    internal static AtendenteSetor Criar(long setorId) => new() { SetorId = setorId };
}

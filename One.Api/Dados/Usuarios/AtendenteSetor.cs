namespace One.Api.Dados.Usuarios;

public class AtendenteSetor : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; set; }
    public long SetorId { get; set; }
}

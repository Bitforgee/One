namespace One.Api.Dados.Usuarios;

public class TokenAcesso : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; set; }
    public string Hash { get; set; } = "";
    public DateTime CriadoEm { get; set; }
    public DateTime ExpiraEm { get; set; }
    public DateTime? UsadoEm { get; set; }
}

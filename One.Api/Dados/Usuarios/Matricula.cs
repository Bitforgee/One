namespace One.Api.Dados.Usuarios;

public class Matricula : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; set; }
    public long CursoId { get; set; }
    public Curso? Curso { get; set; }
    public string Numero { get; set; } = "";
    public int Semestre { get; set; }
    public string Situacao { get; set; } = "ATIVA";
}

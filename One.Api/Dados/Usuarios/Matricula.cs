namespace One.Api.Dados.Usuarios;

public class Matricula : IDaInstituicao
{
    Matricula() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; private set; }
    public long CursoId { get; private set; }
    public Curso? Curso { get; private set; }
    public string Numero { get; private set; } = "";
    public int Semestre { get; private set; }
    public string Situacao { get; private set; } = "ATIVA";

    internal static Matricula Criar(string numero, long cursoId, int semestre, string situacao) =>
        new() { Numero = numero, CursoId = cursoId, Semestre = semestre, Situacao = situacao };

    public void Atualizar(long cursoId, int semestre, string situacao) => (CursoId, Semestre, Situacao) = (cursoId, semestre, situacao);
}

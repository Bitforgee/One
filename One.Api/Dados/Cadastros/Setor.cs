namespace One.Api.Dados.Cadastros;

public class Setor : IDaInstituicao
{
    public const string MotivoNome = "Informe o nome do setor.";
    public const string MotivoTurmaJunta = "Informe o curso e o semestre da liderança juntos.";
    public const string MotivoSemestre = "O semestre deve ficar entre 1 e 12.";
    public const string MotivoCurso = "Escolha um curso da instituição.";
    public const string MotivoTriagemLideranca = "O setor de triagem não pode ser uma liderança.";

    public const int LimiteNome = 100;

    Setor() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public string Nome { get; private set; } = "";
    public bool Triagem { get; private set; }
    public bool Ativo { get; private set; } = true;
    public long? CursoId { get; private set; }
    public int? Semestre { get; private set; }

    public static Invalido? Validar(string? nome, bool? triagem, long? cursoId, int? semestre, bool cursoExiste = true)
    {
        if (string.IsNullOrWhiteSpace(nome) || nome.Length > LimiteNome) return new Invalido(MotivoNome);
        return Turma(triagem, cursoId, semestre, cursoExiste);
    }

    static Invalido? Turma(bool? triagem, long? cursoId, int? semestre, bool cursoExiste)
    {
        if (cursoId is null && semestre is null) return null;
        if (cursoId is null || semestre is null) return new Invalido(MotivoTurmaJunta);
        if (semestre is < 1 or > 12) return new Invalido(MotivoSemestre);
        if (!cursoExiste) return new Invalido(MotivoCurso);
        return triagem == true ? new Invalido(MotivoTriagemLideranca) : null;
    }

    public static Setor Criar(string? nome, bool? triagem = null, bool? ativo = null, long? cursoId = null, int? semestre = null)
    {
        if (string.IsNullOrWhiteSpace(nome) || Turma(triagem, cursoId, semestre, true) is not null) throw new InvalidOperationException("Setor sem validar.");
        return new() { Nome = nome!, Triagem = triagem == true, Ativo = ativo ?? true, CursoId = cursoId, Semestre = semestre };
    }

    public static Setor CriarTriagem() => new() { Nome = "Triagem", Triagem = true };

    public void Alterar(string? nome, bool? triagem, bool? ativo)
    {
        if (Validar(nome, triagem, null, null) is not null) throw new InvalidOperationException("Setor sem validar.");
        (Nome, Triagem, Ativo) = (nome!, triagem == true, ativo ?? true);
    }
}

using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record CriarSetor(CriarSetor.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Nome, bool? Triagem, bool? Ativo, long? CursoId = null, int? Semestre = null);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/setores", (CriarSetor.Entrada i, IMediator m) => m.Send(new CriarSetor(i)));

    public static void Aplicar(Setor s, Entrada e) { s.Nome = e.Nome!; s.Triagem = e.Triagem == true; s.Ativo = e.Ativo ?? true; }

    public static async Task<IResult?> Validar(OneDb db, Entrada e, Setor? atual)
    {
        if (!AdminRotas.Nome(e.Nome)) return Problemas.Invalido("Informe o nome do setor.", "nome");
        if (atual is null && await Turma(db, e) is { } erroDaTurma) return erroDaTurma;
        return await TriagemENome(db, e, atual) ?? await LiderancaRepetida(db, e, atual);
    }

    static async Task<IResult?> TriagemENome(OneDb db, Entrada e, Setor? atual)
    {
        var triagens = await db.Setores.CountAsync(s => s.Triagem && s.Id != (atual == null ? 0 : atual.Id)) + (e.Triagem == true ? 1 : 0);
        if (triagens != 1) return Problemas.Invalido("A instituição precisa de exatamente um setor de triagem.", "triagem");
        return await db.Setores.AnyAsync(s => s.Nome == e.Nome && s.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe um setor com este nome.") : null;
    }

    // Curso e semestre vêm juntos, dentro dos limites, e nunca num setor de triagem (AC 50, AC 51).
    static async Task<IResult?> Turma(OneDb db, Entrada e)
    {
        if (e.CursoId is null && e.Semestre is null) return null;
        if (e.CursoId is null || e.Semestre is null) return Problemas.Invalido("Informe o curso e o semestre da liderança juntos.", "semestre");
        if (e.Semestre is < 1 or > 12) return Problemas.Invalido("O semestre deve ficar entre 1 e 12.", "semestre");
        if (!await db.Cursos.AnyAsync(c => c.Id == e.CursoId)) return Problemas.Invalido("Escolha um curso da instituição.", "cursoId");
        return e.Triagem == true ? Problemas.Invalido("O setor de triagem não pode ser uma liderança.", "triagem") : null;
    }

    // Uma liderança ativa por curso e semestre, ao criar e ao reativar (AC 52). O índice ux_setor_lideranca fecha a corrida.
    static async Task<IResult?> LiderancaRepetida(OneDb db, Entrada e, Setor? atual)
    {
        var (curso, semestre) = atual is null ? (e.CursoId, e.Semestre) : (atual.CursoId, atual.Semestre);
        if (curso is null || e.Ativo == false) return null;
        var id = atual?.Id ?? 0;
        return await db.Setores.AnyAsync(s => s.CursoId == curso && s.Semestre == semestre && s.Ativo && s.Id != id)
            ? AdminRotas.Repetido("Já existe uma liderança ativa para este curso e semestre.")
            : null;
    }
}

public sealed class CriarSetorHandler(OneDb db) : IRequestHandler<CriarSetor, IResult>
{
    public async ValueTask<IResult> Handle(CriarSetor m, CancellationToken ct)
    {
        var e = m.Corpo;
        return await CadastroRotas.Criar<Setor, SetorResposta>(db, "/setores", a => CriarSetor.Validar(db, e, a), s => { CriarSetor.Aplicar(s, e); (s.CursoId, s.Semestre) = (e.CursoId, e.Semestre); }, SetorResposta.De);
    }
}

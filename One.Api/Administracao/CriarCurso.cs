using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record CriarCurso(CriarCurso.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Nome, long? SetorCoordenacaoId);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/cursos", (CriarCurso.Entrada i, IMediator m) => m.Send(new CriarCurso(i)));

    public static async Task<IResult?> Validar(OneDb db, string? nome, long? setorCoordenacaoId, Curso? atual)
    {
        if (!AdminRotas.Nome(nome, 200)) return Problemas.Invalido("Informe o nome do curso.", "nome");
        if (setorCoordenacaoId is { } l && await db.Setores.AnyAsync(x => x.Id == l && x.CursoId != null)) return Problemas.Invalido("Uma liderança de semestre não pode ser a coordenação de um curso.", "setorCoordenacaoId");
        if (setorCoordenacaoId is { } s && !await db.Setores.AnyAsync(x => x.Id == s)) return Problemas.Invalido("Setor de coordenação inexistente.", "setorCoordenacaoId");
        return await db.Cursos.AnyAsync(c => c.Nome == nome && c.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe um curso com este nome.") : null;
    }
}

public sealed class CriarCursoHandler(OneDb db) : IRequestHandler<CriarCurso, IResult>
{
    public async ValueTask<IResult> Handle(CriarCurso m, CancellationToken ct)
    {
        var e = m.Corpo;
        if (await CriarCurso.Validar(db, e.Nome, e.SetorCoordenacaoId, null) is { } erro) return erro;
        var curso = Curso.Criar(e.Nome!, e.SetorCoordenacaoId);
        db.Cursos.Add(curso);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/admin/cursos/{curso.Id}", CursoResposta.De(curso));
    }
}

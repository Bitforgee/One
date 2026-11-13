using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record CriarCurso(CriarCurso.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Nome, long? SetorCoordenacaoId);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/cursos", (CriarCurso.Entrada i, IMediator m) => m.Send(new CriarCurso(i)));
}

public sealed class CriarCursoHandler(OneDb db) : IRequestHandler<CriarCurso, IResult>
{
    public async ValueTask<IResult> Handle(CriarCurso m, CancellationToken ct)
    {
        var e = m.Corpo;
        if (Curso.Validar(e.Nome) is { } invalido) return Problemas.Invalido(invalido.Motivo, "nome");
        if (await ValidacaoDeCurso.Coordenacao(db, e.SetorCoordenacaoId) is { } erro) return erro;
        if (await db.Cursos.AnyAsync(c => c.Nome == e.Nome, ct)) return ErrosDeAdmin.Repetido("Já existe um curso com este nome.");
        var curso = Curso.Criar(e.Nome!, e.SetorCoordenacaoId);
        db.Cursos.Add(curso);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/admin/cursos/{curso.Id}", CursoResposta.De(curso));
    }
}

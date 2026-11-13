using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record CriarSetor(CriarSetor.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Nome, bool? Triagem, bool? Ativo, long? CursoId = null, int? Semestre = null);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/setores", (CriarSetor.Entrada i, IMediator m) => m.Send(new CriarSetor(i)));
}

public sealed class CriarSetorHandler(OneDb db) : IRequestHandler<CriarSetor, IResult>
{
    public async ValueTask<IResult> Handle(CriarSetor m, CancellationToken ct)
    {
        var e = m.Corpo;
        var cursoExiste = e.CursoId is null || await db.Cursos.AnyAsync(c => c.Id == e.CursoId, ct);
        if (Setor.Validar(e.Nome, e.Triagem, e.CursoId, e.Semestre, cursoExiste) is { } invalido) return Problemas.Invalido(invalido.Motivo, ValidacaoDeSetor.Campo(invalido));
        if ((await ValidacaoDeSetor.TriagemENome(db, e.Nome, e.Triagem, 0) ?? await ValidacaoDeSetor.LiderancaRepetida(db, e.CursoId, e.Semestre, e.Ativo, 0)) is { } erro) return erro;
        var setor = Setor.Criar(e.Nome, e.Triagem, e.Ativo, e.CursoId, e.Semestre);
        db.Setores.Add(setor);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/admin/setores/{setor.Id}", SetorResposta.De(setor));
    }
}

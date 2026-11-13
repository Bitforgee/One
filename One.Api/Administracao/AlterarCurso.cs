using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record AlterarCurso(long Id, AlterarCurso.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Nome, long? SetorCoordenacaoId);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/cursos/{id:long}", (long id, AlterarCurso.Entrada i, IMediator m) => m.Send(new AlterarCurso(id, i)));
}

public sealed class AlterarCursoHandler(OneDb db) : IRequestHandler<AlterarCurso, IResult>
{
    public async ValueTask<IResult> Handle(AlterarCurso m, CancellationToken ct)
    {
        var e = m.Corpo;
        var curso = await db.Cursos.FirstOrDefaultAsync(c => c.Id == m.Id, ct);
        if (curso is null) return AdminRotas.NaoEncontrado();
        if (Curso.Validar(e.Nome) is { } invalido) return Problemas.Invalido(invalido.Motivo, "nome");
        if (await ValidacaoDeCurso.Coordenacao(db, e.SetorCoordenacaoId) is { } erro) return erro;
        if (await db.Cursos.AnyAsync(c => c.Nome == e.Nome && c.Id != curso.Id, ct)) return AdminRotas.Repetido("Já existe um curso com este nome.");
        curso.Alterar(e.Nome!, e.SetorCoordenacaoId);
        await db.SaveChangesAsync(ct);
        return Results.Ok(CursoResposta.De(curso));
    }
}

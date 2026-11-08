using Mediator;
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
        return await CadastroRotas.Alterar<Curso, CursoResposta>(db, m.Id, a => CriarCurso.Validar(db, e.Nome, e.SetorCoordenacaoId, a), s => CriarCurso.Aplicar(s, e.Nome, e.SetorCoordenacaoId), CursoResposta.De);
    }
}

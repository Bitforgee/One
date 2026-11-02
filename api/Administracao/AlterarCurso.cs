using Mediator;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record AlterarCurso(long Id, CursoIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/cursos/{id:long}", (long id, CursoIn i, IMediator m) => m.Send(new AlterarCurso(id, i)));
}

public sealed class AlterarCursoHandler(OneDb db) : IRequestHandler<AlterarCurso, IResult>
{
    public async ValueTask<IResult> Handle(AlterarCurso m, CancellationToken ct) =>
        await CadastroRotas.Alterar<Curso, CursoIn>(db, m.Id, m.Corpo, CriarCurso.Saida, CriarCurso.Validar, CriarCurso.Aplicar);
}

using Mediator;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record ListarCursos : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/cursos", (IMediator m) => m.Send(new ListarCursos()));
}

public sealed class ListarCursosHandler(OneDb db) : IRequestHandler<ListarCursos, IResult>
{
    public async ValueTask<IResult> Handle(ListarCursos m, CancellationToken ct) => await CadastroRotas.Listar<Curso>(db, CriarCurso.Saida);
}

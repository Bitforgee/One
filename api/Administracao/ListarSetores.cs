using Mediator;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record ListarSetores : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/setores", (IMediator m) => m.Send(new ListarSetores()));
}

public sealed class ListarSetoresHandler(OneDb db) : IRequestHandler<ListarSetores, IResult>
{
    public async ValueTask<IResult> Handle(ListarSetores m, CancellationToken ct) => await CadastroRotas.Listar<Setor>(db, CriarSetor.Saida);
}

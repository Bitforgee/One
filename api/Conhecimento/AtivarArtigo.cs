using Mediator;
using One.Api.Dados;

namespace One.Api.Conhecimento;

public sealed record AtivarArtigo(long Id) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/artigos/{id:long}/ativar", (long id, IMediator m) => m.Send(new AtivarArtigo(id)));
}

public sealed class AtivarArtigoHandler(OneDb db, TimeProvider relogio) : IRequestHandler<AtivarArtigo, IResult>
{
    public async ValueTask<IResult> Handle(AtivarArtigo m, CancellationToken ct) => await ArtigoRotas.Mudar(db, m.Id, EstadosArtigo.Ativo, relogio);
}

using Mediator;
using One.Api.Dados;

namespace One.Api.Conhecimento;

public sealed record ArquivarArtigo(long Id) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/artigos/{id:long}/arquivar", (long id, IMediator m) => m.Send(new ArquivarArtigo(id)));
}

public sealed class ArquivarArtigoHandler(OneDb db, TimeProvider relogio) : IRequestHandler<ArquivarArtigo, IResult>
{
    public async ValueTask<IResult> Handle(ArquivarArtigo m, CancellationToken ct) => await ArtigoRotas.Mudar(db, m.Id, EstadosArtigo.Arquivado, relogio);
}

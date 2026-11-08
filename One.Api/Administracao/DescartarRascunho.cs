using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record DescartarRascunho(long Id) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapDelete("/fluxos/{id:long}/rascunho", (long id, IMediator m) => m.Send(new DescartarRascunho(id)));
}

public sealed class DescartarRascunhoHandler(OneDb db) : IRequestHandler<DescartarRascunho, IResult>
{
    public async ValueTask<IResult> Handle(DescartarRascunho m, CancellationToken ct)
    {
        var fluxo = await db.Fluxos.Include(f => f.Versoes).ThenInclude(v => v.Etapas).FirstOrDefaultAsync(f => f.Id == m.Id);
        if (fluxo is null || fluxo.DescartarRascunho() is not null) return AdminRotas.NaoEncontrado();
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}

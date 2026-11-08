using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;
using static One.Api.Administracao.RegraRotas;

namespace One.Api.Administracao;

public sealed record AlterarRegra(long Id, AlterarRegra.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(long? CategoriaId, string? Destino, long? SetorId);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/regras/{id:long}", (long id, AlterarRegra.Entrada i, IMediator m) => m.Send(new AlterarRegra(id, i)));
}

public sealed class AlterarRegraHandler(OneDb db) : IRequestHandler<AlterarRegra, IResult>
{
    public async ValueTask<IResult> Handle(AlterarRegra m, CancellationToken ct)
    {
        var (id, i) = (m.Id, m.Corpo);
        var regra = await db.Regras.FirstOrDefaultAsync(r => r.Id == id);
        if (regra is null) return AdminRotas.NaoEncontrado();
        if (await Validar(db, i.CategoriaId, i.Destino, i.SetorId) is { } erro) return erro;
        if (await db.Regras.AnyAsync(r => r.CategoriaId == i.CategoriaId && r.Id != id)) return AdminRotas.Repetido("Esta categoria já tem uma regra.");
        Aplicar(regra, i.CategoriaId, i.Destino, i.SetorId);
        await db.SaveChangesAsync();
        return Results.Ok(RegraResposta.De(regra));
    }
}

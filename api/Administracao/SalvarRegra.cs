using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;
using static One.Api.Administracao.RegraRotas;

namespace One.Api.Administracao;

public sealed record SalvarRegra(SalvarRegra.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(long? CategoriaId, string? Destino, long? SetorId);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/regras", (SalvarRegra.Entrada i, IMediator m) => m.Send(new SalvarRegra(i)));
}

public sealed class SalvarRegraHandler(OneDb db) : IRequestHandler<SalvarRegra, IResult>
{
    public async ValueTask<IResult> Handle(SalvarRegra m, CancellationToken ct)
    {
        var i = m.Corpo;
        if (await Validar(db, i.CategoriaId, i.Destino, i.SetorId) is { } erro) return erro;
        var regra = await db.Regras.FirstOrDefaultAsync(r => r.CategoriaId == i.CategoriaId);
        var nova = regra is null;
        regra ??= db.Regras.Add(new RegraRoteamento()).Entity;
        Aplicar(regra, i.CategoriaId, i.Destino, i.SetorId);
        await db.SaveChangesAsync();
        return nova ? Results.Created($"/api/admin/regras/{regra.Id}", RegraResposta.De(regra)) : Results.Ok(RegraResposta.De(regra));
    }
}

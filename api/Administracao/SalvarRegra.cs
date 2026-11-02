using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Administracao.RegraRotas;

namespace One.Api.Administracao;

public sealed record SalvarRegra(RegraIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/regras", (RegraIn i, IMediator m) => m.Send(new SalvarRegra(i)));
}

public sealed class SalvarRegraHandler(OneDb db) : IRequestHandler<SalvarRegra, IResult>
{
    public async ValueTask<IResult> Handle(SalvarRegra m, CancellationToken ct)
    {
        var i = m.Corpo;
        if (await Validar(db, i) is { } erro) return erro;
        var regra = await db.Regras.FirstOrDefaultAsync(r => r.CategoriaId == i.CategoriaId);
        var nova = regra is null;
        regra ??= db.Regras.Add(new RegraRoteamento()).Entity;
        Aplicar(regra, i);
        await db.SaveChangesAsync();
        return nova ? Results.Created($"/api/admin/regras/{regra.Id}", Saida(regra)) : Results.Ok(Saida(regra));
    }
}

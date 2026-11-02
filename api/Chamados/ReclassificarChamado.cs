using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Chamados.AcoesChamado;

namespace One.Api.Chamados;

public sealed record ReclassificarChamado(string Numero, ReclassificarIn Corpo, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/chamados/{numero}/reclassificar", (string numero, ReclassificarIn i, HttpContext ctx, IMediator m) => m.Send(new ReclassificarChamado(numero, i, ctx.Usuario(), ctx.Instituicao())));

    public string Acao => "reclassificar";

    public async ValueTask<IResult?> Validar(AcessoChamado a, OneDb db) =>
        await db.Categorias.AnyAsync(c => c.Id == Corpo.CategoriaId && c.Ativa) ? null : Problemas.Invalido("Escolha uma categoria ativa.", "categoriaId");
}

public sealed class ReclassificarChamadoHandler(OneDb db, AcessoChamado a) : IRequestHandler<ReclassificarChamado, IResult>
{
    public async ValueTask<IResult> Handle(ReclassificarChamado m, CancellationToken ct)
    {
        var i = m.Corpo;
        var nomes = await db.Categorias.Where(c => c.Id == a.Chamado.CategoriaId || c.Id == i.CategoriaId).ToDictionaryAsync(c => c.Id, c => c.Nome);
        Evento(db, a, TiposEvento.Reclassificacao, nomes[a.Chamado.CategoriaId], nomes[i.CategoriaId!.Value]);
        a.Chamado.CategoriaId = i.CategoriaId.Value;
        return Results.Empty;
    }
}

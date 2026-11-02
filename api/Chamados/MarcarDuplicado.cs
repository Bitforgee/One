using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Chamados.AcoesChamado;

namespace One.Api.Chamados;

public sealed record MarcarDuplicado(string Numero, DuplicadoIn Corpo, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/chamados/{numero}/duplicado", (string numero, DuplicadoIn i, HttpContext ctx, IMediator m) => m.Send(new MarcarDuplicado(numero, i, ctx.Usuario(), ctx.Instituicao())));

    public string Acao => "duplicado";

    public async ValueTask<IResult?> Validar(AcessoChamado a, OneDb db) =>
        Corpo.NumeroOriginal != a.Chamado.Numero && await db.Chamados.AnyAsync(c => c.Numero == Corpo.NumeroOriginal && c.SolicitanteId == a.Chamado.SolicitanteId)
            ? null : Problemas.Invalido("Informe outro chamado do mesmo aluno.", "numeroOriginal");
}

public sealed class MarcarDuplicadoHandler(OneDb db, AcessoChamado a) : IRequestHandler<MarcarDuplicado, IResult>
{
    public async ValueTask<IResult> Handle(MarcarDuplicado m, CancellationToken ct)
    {
        await RespostaDaEquipe(db, a, $"Este pedido continua em {m.Corpo.NumeroOriginal}.");
        a.Chamado.NumeroOriginal = m.Corpo.NumeroOriginal;
        Fechar(db, a, MotivosFechamento.Duplicado, null);
        return Results.Empty;
    }
}

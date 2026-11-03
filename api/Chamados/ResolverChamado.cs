using Mediator;
using One.Api.Dados;
using static One.Api.Chamados.AcoesChamado;

namespace One.Api.Chamados;

public sealed record ResolverChamado(string Numero, ResolverIn Corpo, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/chamados/{numero}/resolver", (string numero, ResolverIn i, HttpContext ctx, IMediator m) => m.Send(new ResolverChamado(numero, i, ctx.Usuario(), ctx.Instituicao())));

    public string Acao => "resolver";

    public ValueTask<IResult?> Validar(AcessoChamado a, OneDb db) =>
        ValueTask.FromResult(Texto(Corpo.Texto, "texto", "Escreva a resolução, com até 4000 caracteres."));
}

public sealed class ResolverChamadoHandler(OneDb db, AcessoChamado a) : IRequestHandler<ResolverChamado, IResult>
{
    public async ValueTask<IResult> Handle(ResolverChamado m, CancellationToken ct)
    {
        a.Chamado.Resolver(a.Usuario.Id, a.Usuario.Nome, m.Corpo.Texto!, a.Agora);
        await Avisos.Resolvido(db, a.Cfg, a.Prazos, a.Instituicao, a.Chamado, m.Corpo.Texto!, a.Agora); // AC 123
        return Results.Empty;
    }
}

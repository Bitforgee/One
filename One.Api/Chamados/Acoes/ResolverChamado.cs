using Mediator;
using One.Api.Chamados.Permissao;
using One.Api.Dados;
using static One.Api.Chamados.Permissao.AcoesChamado;

namespace One.Api.Chamados.Acoes;

public sealed record ResolverChamado(string Numero, ResolverChamado.Entrada Corpo, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado
{
    public sealed record Entrada(string? Texto);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/chamados/{numero}/resolver", (string numero, ResolverChamado.Entrada i, HttpContext ctx, IMediator m) => m.Send(new ResolverChamado(numero, i, ctx.Usuario(), ctx.Instituicao())));

    public string Acao => "resolver";

    public ValueTask<IResult?> Validar(AcessoChamado a, OneDb db) =>
        ValueTask.FromResult(Texto(Corpo.Texto, "texto", "Escreva a resolução, com até 4000 caracteres."));
}

public sealed class ResolverChamadoHandler(OneDb db, AcessoChamado a, IConfiguration cfg, Prazos prazos) : IRequestHandler<ResolverChamado, IResult>
{
    public async ValueTask<IResult> Handle(ResolverChamado m, CancellationToken ct)
    {
        a.Chamado.Resolver(m.Usuario.Id, m.Usuario.Nome, m.Corpo.Texto!, a.Agora);
        await Avisos.Resolvido(db, cfg, prazos, m.Instituicao, a.Chamado, m.Corpo.Texto!, a.Agora);
        return Results.Empty;
    }
}

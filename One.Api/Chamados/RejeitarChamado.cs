using Mediator;
using One.Api.Dados;
using static One.Api.Chamados.AcoesChamado;

namespace One.Api.Chamados;

public sealed record RejeitarChamado(string Numero, RejeitarChamado.Entrada Corpo, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado
{
    public sealed record Entrada(string? Motivo);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/chamados/{numero}/rejeitar", (string numero, RejeitarChamado.Entrada i, HttpContext ctx, IMediator m) => m.Send(new RejeitarChamado(numero, i, ctx.Usuario(), ctx.Instituicao())));

    public string Acao => "rejeitar";

    public ValueTask<IResult?> Validar(AcessoChamado a, OneDb db) =>
        ValueTask.FromResult(Texto(Corpo.Motivo, "motivo", "Explique o motivo da rejeição, com até 4000 caracteres."));
}

public sealed class RejeitarChamadoHandler(OneDb db, AcessoChamado a) : IRequestHandler<RejeitarChamado, IResult>
{
    public async ValueTask<IResult> Handle(RejeitarChamado m, CancellationToken ct) => await RejeitarResolucao(db, a, m.Corpo.Motivo!);
}

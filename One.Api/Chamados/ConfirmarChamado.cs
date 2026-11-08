using Mediator;
using One.Api.Dados;
using static One.Api.Chamados.AcoesChamado;

namespace One.Api.Chamados;

public sealed record ConfirmarChamado(string Numero, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/chamados/{numero}/confirmar", (string numero, HttpContext ctx, IMediator m) => m.Send(new ConfirmarChamado(numero, ctx.Usuario(), ctx.Instituicao())));

    public string Acao => "confirmar";

    public ValueTask<IResult?> Validar(AcessoChamado a, OneDb db) => ValueTask.FromResult<IResult?>(null);
}

public sealed class ConfirmarChamadoHandler(AcessoChamado a) : IRequestHandler<ConfirmarChamado, IResult>
{
    public ValueTask<IResult> Handle(ConfirmarChamado m, CancellationToken ct)
    {
        a.Chamado.Confirmar(a.Usuario.Id, a.Agora);
        return ValueTask.FromResult(Results.Empty);
    }
}

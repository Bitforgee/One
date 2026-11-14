using Mediator;
using One.Api.Chamados.Permissao;
using One.Api.Dados;
using static One.Api.Chamados.Permissao.AcoesChamado;

namespace One.Api.Chamados.Acoes;

public sealed record CancelarChamado(string Numero, CancelarChamado.Entrada? Corpo, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado
{
    public sealed record Entrada(string? Motivo);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/chamados/{numero}/cancelar", (string numero, CancelarChamado.Entrada? i, HttpContext ctx, IMediator m) => m.Send(new CancelarChamado(numero, i, ctx.Usuario(), ctx.Instituicao())));

    public string Acao => "cancelar";

    public ValueTask<IResult?> Validar(AcessoChamado a, OneDb db) =>
        ValueTask.FromResult(Corpo?.Motivo is { Length: > 4000 } ? Problemas.Invalido("A justificativa pode ter até 4000 caracteres.", "motivo") : null);
}

public sealed class CancelarChamadoHandler(AcessoChamado a) : IRequestHandler<CancelarChamado, IResult>
{
    public ValueTask<IResult> Handle(CancelarChamado m, CancellationToken ct)
    {
        a.Chamado.Cancelar(m.Usuario.Id, m.Corpo?.Motivo, a.Agora);
        return ValueTask.FromResult(Results.Empty);
    }
}

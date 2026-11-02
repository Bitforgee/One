using Mediator;
using One.Api.Dados;
using static One.Api.Chamados.AcoesChamado;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Chamados;

public sealed record AssumirChamado(string Numero, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/chamados/{numero}/assumir", (string numero, HttpContext ctx, IMediator m) => m.Send(new AssumirChamado(numero, ctx.Usuario(), ctx.Instituicao())));

    public string Acao => "assumir";

    public ValueTask<IResult?> Validar(AcessoChamado a, OneDb db) => ValueTask.FromResult<IResult?>(null);
}

public sealed class AssumirChamadoHandler(OneDb db, AcessoChamado a) : IRequestHandler<AssumirChamado, IResult>
{
    public async ValueTask<IResult> Handle(AssumirChamado m, CancellationToken ct)
    {
        if (a.Chamado.ResponsavelId == a.Usuario.Id) return Problemas.Erro(409, "Você já é o responsável por este chamado.");
        await Atribuir(db, a, a.Usuario.Id);
        if (a.Chamado.Estado == Aberto) Mudar(db, a, EmAtendimento);
        return Results.Empty;
    }
}

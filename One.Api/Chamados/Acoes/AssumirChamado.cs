using Mediator;
using One.Api.Chamados.Permissao;
using One.Api.Dados;
using static One.Api.Chamados.Permissao.AcoesChamado;

namespace One.Api.Chamados.Acoes;

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
        var recusa = a.Chamado.Assumir(m.Usuario.Id, await NomeDoResponsavel(db, a.Chamado), m.Usuario.Nome, a.Agora);
        return recusa is null ? Results.Empty : Problemas.Erro(409, recusa.Motivo);
    }
}

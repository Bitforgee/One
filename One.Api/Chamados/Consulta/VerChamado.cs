using Mediator;
using One.Api.Dados;

namespace One.Api.Chamados.Consulta;

public sealed record VerChamado(string Numero, Usuario Usuario) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/chamados/{numero}", (string numero, HttpContext ctx, IMediator m) => m.Send(new VerChamado(numero, ctx.Usuario())));
}

public sealed class VerChamadoHandler(OneDb db) : IRequestHandler<VerChamado, IResult>
{
    public async ValueTask<IResult> Handle(VerChamado m, CancellationToken ct)
    {
        var (chamado, papel) = await ChamadoDoUsuario.Carregar(db, m.Usuario, m.Numero);
        return chamado is null ? ChamadoDoUsuario.NaoEncontrado() : Results.Ok(await DetalheChamado.Montar(db, m.Usuario.Id, chamado, papel!));
    }
}

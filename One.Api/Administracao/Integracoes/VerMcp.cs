using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao.Integracoes;

public sealed record VerMcp : IRequest<IResult>
{
    public sealed record Item(long Id, string Nome, string Usuario, string Final, DateTime CriadoEm, DateTime ExpiraEm, DateTime? UltimoUsoEm, string Estado);

    public sealed record Resposta(string Url, IReadOnlyList<Item> Tokens);

    public static void Mapear(RouteGroupBuilder g) => g.MapGet("/mcp", (IMediator m) => m.Send(new VerMcp()));
}

public sealed class VerMcpHandler(OneDb db, IConfiguration cfg, TimeProvider relogio) : IRequestHandler<VerMcp, IResult>
{
    sealed record TokenComDono(TokenMcp Token, string Usuario);

    public async ValueTask<IResult> Handle(VerMcp m, CancellationToken ct)
    {
        var agora = relogio.GetUtcNow().UtcDateTime;
        var i = await db.Instituicoes.SingleAsync(x => x.Id == db.InstituicaoAtual, ct);
        var tokens = await db.TokensMcp.OrderByDescending(t => t.CriadoEm).ThenByDescending(t => t.Id)
            .Select(t => new TokenComDono(t, db.Usuarios.Where(u => u.Id == t.UsuarioId).Select(u => u.Nome).Single())).ToListAsync(ct);
        var itens = tokens.Select(t => new VerMcp.Item(t.Token.Id, t.Token.Nome, t.Usuario, t.Token.Final, t.Token.CriadoEm, t.Token.ExpiraEm, t.Token.UltimoUsoEm, t.Token.Estado(agora))).ToList();
        return Results.Ok(new VerMcp.Resposta($"{Tokens.UrlBase(cfg)}/api/mcp/{i.Slug}", itens));
    }
}

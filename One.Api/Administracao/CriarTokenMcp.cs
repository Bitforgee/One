using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record CriarTokenMcp(CriarTokenMcp.Entrada Corpo, Usuario Admin) : IRequest<IResult>
{
    public const int MaximoDoNome = 60;
    static readonly int[] DiasAceitos = [30, 90, 365];

    public sealed record Entrada(string? Nome, int? Dias);

    public sealed record Resposta(long Id, string Nome, string Token, string Final, DateTime CriadoEm, DateTime ExpiraEm);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/mcp/tokens", (Entrada e, HttpContext ctx, IMediator m) => m.Send(new CriarTokenMcp(e, ctx.Usuario())));

    public static IResult? Validar(string? nome, int? dias)
    {
        if (string.IsNullOrWhiteSpace(nome) || nome.Length > MaximoDoNome) return Problemas.Invalido($"O nome é obrigatório e aceita até {MaximoDoNome} caracteres.", "nome");
        if (dias is not { } d || !DiasAceitos.Contains(d)) return Problemas.Invalido("A validade deve ser de 30, 90 ou 365 dias.", "dias");
        return null;
    }
}

public sealed class CriarTokenMcpHandler(OneDb db, TimeProvider relogio) : IRequestHandler<CriarTokenMcp, IResult>
{
    public async ValueTask<IResult> Handle(CriarTokenMcp m, CancellationToken ct)
    {
        var nome = m.Corpo.Nome?.Trim();
        if (CriarTokenMcp.Validar(nome, m.Corpo.Dias) is { } erro) return erro;
        var agora = relogio.GetUtcNow().UtcDateTime;
        var ativos = await db.TokensMcp.CountAsync(t => t.UsuarioId == m.Admin.Id && t.RevogadoEm == null && t.ExpiraEm > agora, ct);
        if (ativos >= TokenMcp.MaximoAtivosPorUsuario) return ErrosDeAdmin.Repetido($"Você já tem {TokenMcp.MaximoAtivosPorUsuario} tokens ativos. Revogue um para criar outro.");
        var slug = await db.Instituicoes.Where(x => x.Id == db.InstituicaoAtual).Select(x => x.Slug).SingleAsync(ct);
        var token = TokenMcp.NovoMcp(slug);
        var registro = TokenMcp.Criar(m.Admin.Id, nome!, Tokens.Hash(token), token[^4..], agora, m.Corpo.Dias!.Value);
        db.TokensMcp.Add(registro);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/admin/mcp/tokens/{registro.Id}", new CriarTokenMcp.Resposta(registro.Id, registro.Nome, token, registro.Final, registro.CriadoEm, registro.ExpiraEm));
    }
}

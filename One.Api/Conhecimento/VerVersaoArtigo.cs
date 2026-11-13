using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento;

public sealed record VerVersaoArtigo(long Id, long UsuarioId) : IRequest<IResult>
{
    public sealed record Resposta(string Titulo, string Texto, IReadOnlyList<string> Links, long? VersaoAtivaAtualId);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/artigos/versoes/{id:long}", (long id, HttpContext ctx, IMediator m) => m.Send(new VerVersaoArtigo(id, ctx.Usuario().Id)));
}

public sealed class VerVersaoArtigoHandler(OneDb db) : IRequestHandler<VerVersaoArtigo, IResult>
{
    public async ValueTask<IResult> Handle(VerVersaoArtigo m, CancellationToken ct)
    {
        var u = await db.Usuarios.Include(x => x.Papeis).FirstAsync(x => x.Id == m.UsuarioId, ct);
        if (!u.Tem(Papeis.Atendente) && !u.Tem(Papeis.Administrador) || await db.SoLideranca(u)) return Problemas.Erro(404, "Versão de artigo não encontrada.");
        var v = await db.VersoesArtigo.Include(x => x.Artigo).FirstOrDefaultAsync(x => x.Id == m.Id);
        if (v is null) return Problemas.Erro(404, "Versão de artigo não encontrada.");
        var atual = await db.VersoesAtuais().Where(x => x.ArtigoId == v.ArtigoId).Select(x => x.Id).FirstAsync();
        return Results.Ok(new VerVersaoArtigo.Resposta(v.Titulo, v.Resposta, v.Links,
            v.Artigo!.Estado == EstadosArtigo.Ativo && atual != v.Id ? atual : (long?)null));
    }
}

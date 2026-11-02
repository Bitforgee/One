using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento;

// Só atendentes e administradores veem a base interna; para os demais a versão "não existe" (AC 40).
public sealed record VerVersaoArtigo(long Id, Usuario Usuario) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/artigos/versoes/{id:long}", (long id, HttpContext ctx, IMediator m) => m.Send(new VerVersaoArtigo(id, ctx.Usuario())));
}

public sealed class VerVersaoArtigoHandler(OneDb db) : IRequestHandler<VerVersaoArtigo, IResult>
{
    public async ValueTask<IResult> Handle(VerVersaoArtigo m, CancellationToken ct)
    {
        var u = m.Usuario;
        if (!u.Tem(Papeis.Atendente) && !u.Tem(Papeis.Administrador)) return Problemas.Erro(404, "Versão de artigo não encontrada.");
        var v = await db.VersoesArtigo.Include(x => x.Artigo).FirstOrDefaultAsync(x => x.Id == m.Id);
        if (v is null) return Problemas.Erro(404, "Versão de artigo não encontrada.");
        var atual = await db.VersoesAtuais().Where(x => x.ArtigoId == v.ArtigoId).Select(x => x.Id).FirstAsync();
        return Results.Ok(new
        {
            titulo = v.Titulo,
            texto = v.Resposta,
            links = v.Links,
            versaoAtivaAtualId = v.Artigo!.Estado == EstadosArtigo.Ativo && atual != v.Id ? atual : (long?)null,
        });
    }
}

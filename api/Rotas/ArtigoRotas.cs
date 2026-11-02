using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Rotas;

public static class ArtigoRotas
{
    public static void Mapear(RouteGroupBuilder api)
    {
        // Só atendentes e administradores veem a base interna; para os demais a versão "não existe" (AC 40).
        api.MapGet("/artigos/versoes/{id:long}", async (long id, HttpContext ctx, OneDb db) =>
        {
            var u = ctx.Usuario();
            if (!u.Tem(Papeis.Atendente) && !u.Tem(Papeis.Administrador)) return Problemas.Erro(404, "Versão de artigo não encontrada.");
            var v = await db.VersoesArtigo.Include(x => x.Artigo).FirstOrDefaultAsync(x => x.Id == id);
            if (v is null) return Problemas.Erro(404, "Versão de artigo não encontrada.");
            var atual = await db.VersoesArtigo.Where(x => x.ArtigoId == v.ArtigoId).OrderByDescending(x => x.Numero).Select(x => x.Id).FirstAsync();
            return Results.Ok(new
            {
                titulo = v.Titulo,
                texto = v.Resposta,
                links = v.Links,
                versaoAtivaAtualId = v.Artigo!.Estado == EstadosArtigo.Ativo && atual != v.Id ? atual : (long?)null,
            });
        });
    }
}

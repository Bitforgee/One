using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Acesso;

public static class InstituicaoRotas
{
    public static void Mapear(RouteGroupBuilder api)
    {
        api.MapGet("/instituicoes/{slug}", async (string slug, OneDb db) =>
            await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == slug && i.Ativa) is { } i
                ? Results.Ok(new { nome = i.Nome })
                : Problemas.Erro(404, "Instituição não encontrada.")).AllowAnonymous();
    }
}

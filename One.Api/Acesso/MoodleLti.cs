using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Acesso;

public static class MoodleLti
{
    public static IResult NaoEncontrada() => Problemas.Erro(404, "Instituição não encontrada.");

    public static async Task<Instituicao?> Ativa(OneDb db, string slug, CancellationToken ct)
    {
        var i = await db.Instituicoes.FirstOrDefaultAsync(x => x.Slug == slug && x.Ativa, ct);
        if (i is not null) db.InstituicaoAtual = i.Id;
        return i;
    }

    public static string Aleatorio() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    public static string Url(IConfiguration cfg, string slug, string parte) => $"{Tokens.UrlBase(cfg)}/api/moodle/{slug}/{parte}";
}

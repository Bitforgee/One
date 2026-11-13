using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Instituicoes;

public static class ArquivoDeComando
{
    public static async Task<(Instituicao?, T?, string?)> Ler<T>(OneDb db, Dictionary<string, string> o) where T : class
    {
        var slug = o.GetValueOrDefault("slug") ?? "";
        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == slug);
        if (instituicao is null) return (null, null, $"--slug: instituição \"{slug}\" não existe");
        if (!File.Exists(o.GetValueOrDefault("arquivo"))) return (null, null, $"--arquivo: arquivo \"{o.GetValueOrDefault("arquivo")}\" não encontrado");
        try { return (instituicao, JsonSerializer.Deserialize<T>(await File.ReadAllTextAsync(o["arquivo"]), JsonSerializerOptions.Web), null); }
        catch (JsonException e) { return (null, null, $"--arquivo: JSON inválido ({e.Message})"); }
    }
}

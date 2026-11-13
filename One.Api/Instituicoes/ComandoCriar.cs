using One.Api.Dados;

namespace One.Api.Instituicoes;

public sealed class ComandoCriar(OneDb db, TimeProvider relogio, IConfiguration cfg)
{
    public async Task<List<string>> Executar(Dictionary<string, string> o, TextWriter saida)
    {
        var agora = relogio.GetUtcNow().UtcDateTime;
        string Valor(string chave) => o.GetValueOrDefault(chave)?.Trim() ?? "";
        var n = new NovaInstituicao(Valor("slug"), Valor("nome"), Valor("fuso"), Cpf.Tentar(Valor("admin-cpf")), Valor("admin-nome"), Valor("admin-email"));
        var erros = await Criacao.Validar(db, n);
        if (erros.Count > 0) return [.. erros.Select(e => $"--{e.Campo.Replace('.', '-')}: {e.Mensagem}")];

        var (_, token) = await Criacao.Gravar(db, n, agora, null);

        saida.WriteLine($"Instituição {n.Slug} criada.");
        saida.WriteLine($"Link de primeiro acesso do administrador (vale 60 minutos): {Tokens.Link(cfg, n.Slug, token)}");
        return [];
    }
}

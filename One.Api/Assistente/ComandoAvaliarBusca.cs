using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Conhecimento;
using One.Api.Dados;

namespace One.Api.Assistente;

public sealed class ComandoAvaliarBusca(OneDb db, Embeddings embeddings, Assistente assistente)
{
    record PerguntaAvaliacao(string? Pergunta, string? Fonte);

    public static Task<int> Rodar(IServiceProvider servicos, string[] args) => Executar(servicos, args, Console.Out, Console.Error);

    public static async Task<int> Executar(IServiceProvider servicos, string[] args, TextWriter saida, TextWriter erro)
    {
        using var escopo = servicos.CreateScope();
        var opcoes = new Dictionary<string, string>();
        for (var i = 1; i + 1 < args.Length; i += 2)
            if (args[i].StartsWith("--")) opcoes[args[i][2..]] = args[i + 1];
        var erros = await ActivatorUtilities.CreateInstance<ComandoAvaliarBusca>(escopo.ServiceProvider).Executar(opcoes, saida);
        foreach (var e in erros) erro.WriteLine(e);
        return erros.Count == 0 ? 0 : 1;
    }

    async Task<(Instituicao?, List<PerguntaAvaliacao>?, string?)> LerArquivo(Dictionary<string, string> o)
    {
        var slug = o.GetValueOrDefault("slug") ?? "";
        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == slug);
        if (instituicao is null) return (null, null, $"--slug: instituição \"{slug}\" não existe");
        if (!File.Exists(o.GetValueOrDefault("arquivo"))) return (null, null, $"--arquivo: arquivo \"{o.GetValueOrDefault("arquivo")}\" não encontrado");
        try { return (instituicao, JsonSerializer.Deserialize<List<PerguntaAvaliacao>>(await File.ReadAllTextAsync(o["arquivo"]), JsonSerializerOptions.Web), null); }
        catch (JsonException e) { return (null, null, $"--arquivo: JSON inválido ({e.Message})"); }
    }

    public async Task<List<string>> Executar(Dictionary<string, string> o, TextWriter saida)
    {
        var (instituicao, perguntas, erro) = await LerArquivo(o);
        if (erro is not null) return [erro];
        if (perguntas is null || perguntas.Count == 0) return ["--arquivo: nenhuma pergunta"];

        db.InstituicaoAtual = instituicao!.Id;
        var erros = await ValidarPerguntas(perguntas);
        if (erros.Count > 0) return erros;

        var acertos = 0;
        foreach (var p in perguntas)
        {
            var (posicao, falha) = await Avaliar(instituicao.Id, p, saida);
            if (falha is not null) return [falha];
            if (posicao > 0) acertos++;
        }
        saida.WriteLine($"{acertos}/{perguntas.Count}");
        return [];
    }

    async Task<List<string>> ValidarPerguntas(List<PerguntaAvaliacao> perguntas)
    {
        var artigos = await db.VersoesAtuais().Where(v => v.Artigo!.Estado == EstadosArtigo.Ativo).Select(v => v.Titulo).ToListAsync();
        var titulos = artigos.Concat(await db.Documentos.Where(d => d.Estado == EstadosDocumento.Ativo).Select(d => d.Titulo).ToListAsync()).ToHashSet();
        var erros = new List<string>();
        foreach (var (p, i) in perguntas.Select((p, i) => (p, i)))
        {
            if (string.IsNullOrWhiteSpace(p?.Pergunta)) erros.Add($"[{i}].pergunta: obrigatória");
            if (p?.Fonte is not { } fonte || !titulos.Contains(fonte)) erros.Add($"[{i}].fonte: \"{p?.Fonte}\" não é título de artigo ou documento ativo");
        }
        return erros;
    }

    async Task<(int, string?)> Avaliar(long instituicaoId, PerguntaAvaliacao p, TextWriter saida)
    {
        float[] vetor;
        try { vetor = (await embeddings.Gerar([Mascara.Aplicar(p.Pergunta!)]))[0]; }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or InvalidOperationException or JsonException)
        {
            return (0, $"embeddings: falha ao gerar o vetor da pergunta \"{p.Pergunta}\" ({e.Message})");
        }
        var buscadas = await assistente.Buscar(vetor, instituicaoId);
        var posicao = buscadas.FindIndex(f => f.Titulo == p.Fonte) + 1;
        var lista = string.Join(" | ", buscadas.Select(f => $"{f.Titulo} ({f.Distancia.ToString("0.000", System.Globalization.CultureInfo.InvariantCulture)})"));
        saida.WriteLine(posicao > 0 ? $"acerto {posicao}: {p.Pergunta} -> {lista}" : $"erro: {p.Pergunta} (esperado \"{p.Fonte}\") -> {lista}");
        return (posicao, null);
    }
}

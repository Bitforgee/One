using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Assistente;
using One.Api.Conhecimento;

namespace One.Api.Instituicoes;

public static class InstituicaoComando
{
    public static async Task<int> Executar(IServiceProvider servicos, string[] args, TextWriter saida, TextWriter erro)
    {
        using var scope = servicos.CreateScope();
        var sp = scope.ServiceProvider;
        var remover = args.Contains("--remover");
        string[] pares = [.. args.Where(a => a != "--remover")];
        var opcoes = new Dictionary<string, string>();
        for (var i = 1; i + 1 < pares.Length; i += 2)
            if (pares[i].StartsWith("--")) opcoes[pares[i][2..]] = pares[i + 1];

        var erros = args.FirstOrDefault() switch
        {
            "criar" => await Criar(sp, opcoes, saida),
            "carga" => await Carga(sp, opcoes, saida),
            "avaliar-busca" => await AvaliarBusca(sp, opcoes, saida),
            "operador" => await Operador(sp, opcoes, remover, saida),
            _ => ["uso: instituicao criar --slug --nome --fuso --admin-cpf --admin-nome --admin-email | instituicao carga --slug --arquivo | instituicao avaliar-busca --slug --arquivo | instituicao operador --slug --cpf [--remover]"],
        };
        foreach (var e in erros) erro.WriteLine(e);
        return erros.Count == 0 ? 0 : 1;
    }

    static async Task<List<string>> Criar(IServiceProvider sp, Dictionary<string, string> o, TextWriter saida)
    {
        var db = sp.GetRequiredService<OneDb>();
        var agora = sp.GetRequiredService<TimeProvider>().GetUtcNow().UtcDateTime;
        string Valor(string chave) => o.GetValueOrDefault(chave)?.Trim() ?? "";
        var n = new NovaInstituicao(Valor("slug"), Valor("nome"), Valor("fuso"), Cpf.Normalizar(Valor("admin-cpf")), Valor("admin-nome"), Valor("admin-email"));
        var erros = await Criacao.Validar(db, n);
        if (erros.Count > 0) return [.. erros.Select(e => $"--{e.Campo.Replace('.', '-')}: {e.Mensagem}")];

        var (_, token) = await Criacao.Gravar(db, n, agora, null);

        saida.WriteLine($"Instituição {n.Slug} criada.");
        saida.WriteLine($"Link de primeiro acesso do administrador (vale 60 minutos): {Tokens.Link(sp.GetRequiredService<IConfiguration>(), n.Slug, token)}");
        return [];
    }

    static async Task<(Instituicao?, T?, string?)> LerArquivo<T>(OneDb db, Dictionary<string, string> o) where T : class
    {
        var slug = o.GetValueOrDefault("slug") ?? "";
        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == slug);
        if (instituicao is null) return (null, null, $"--slug: instituição \"{slug}\" não existe");
        if (!File.Exists(o.GetValueOrDefault("arquivo"))) return (null, null, $"--arquivo: arquivo \"{o.GetValueOrDefault("arquivo")}\" não encontrado");
        try { return (instituicao, JsonSerializer.Deserialize<T>(await File.ReadAllTextAsync(o["arquivo"]), JsonSerializerOptions.Web), null); }
        catch (JsonException e) { return (null, null, $"--arquivo: JSON inválido ({e.Message})"); }
    }

    static async Task<List<string>> Carga(IServiceProvider sp, Dictionary<string, string> o, TextWriter saida)
    {
        var db = sp.GetRequiredService<OneDb>();
        var (instituicao, arq, erro) = await LerArquivo<ArquivoCarga>(db, o);
        if (erro is not null) return [erro];
        if (arq is null) return ["--arquivo: vazio"];

        db.InstituicaoAtual = instituicao!.Id;
        var existentes = await CargaInicial.Existentes(db);
        var (erros, plano) = CargaValidacao.Validar(arq, existentes);
        if (erros.Count > 0) return erros;

        var (setores, categorias) = await CargaInicial.Gravar(db, arq, existentes, plano, sp.GetRequiredService<TimeProvider>().GetUtcNow().UtcDateTime);
        saida.WriteLine($"setores: {setores}");
        saida.WriteLine($"cursos: {plano.Cursos.Count}");
        saida.WriteLine($"categorias: {categorias}");
        saida.WriteLine($"regras: {plano.Regras.Count}");
        saida.WriteLine($"artigos: {plano.Artigos.Count}");
        return [];
    }

    static async Task<List<string>> Operador(IServiceProvider sp, Dictionary<string, string> o, bool remover, TextWriter saida)
    {
        var db = sp.GetRequiredService<OneDb>();
        var slug = o.GetValueOrDefault("slug") ?? "";
        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == slug);
        if (instituicao is null) return [$"--slug: instituição \"{slug}\" não existe"];

        db.InstituicaoAtual = instituicao.Id;
        var cpf = Cpf.Normalizar(o.GetValueOrDefault("cpf"));
        var usuario = await db.Usuarios.Include(u => u.Papeis).FirstOrDefaultAsync(u => u.Cpf == cpf);
        if (usuario is null) return [$"--cpf: não há usuário com o CPF \"{o.GetValueOrDefault("cpf")}\" em \"{slug}\""];
        if (!usuario.Ativo) return [$"--cpf: o usuário {usuario.Nome} está inativo"];

        if (remover) usuario.Papeis.RemoveAll(p => p.Papel == Papeis.Operador);
        else if (!usuario.Tem(Papeis.Operador)) usuario.Papeis.Add(new UsuarioPapel { Papel = Papeis.Operador });
        await db.SaveChangesAsync();
        saida.WriteLine($"Operador {usuario.Nome} {(remover ? "removido" : "adicionado")}.");
        return [];
    }

    record PerguntaAvaliacao(string? Pergunta, string? Fonte);

    static async Task<List<string>> AvaliarBusca(IServiceProvider sp, Dictionary<string, string> o, TextWriter saida)
    {
        var db = sp.GetRequiredService<OneDb>();
        var (instituicao, perguntas, erro) = await LerArquivo<List<PerguntaAvaliacao>>(db, o);
        if (erro is not null) return [erro];
        if (perguntas is null || perguntas.Count == 0) return ["--arquivo: nenhuma pergunta"];

        db.InstituicaoAtual = instituicao!.Id;
        var erros = await ValidarPerguntas(db, perguntas);
        if (erros.Count > 0) return erros;

        var acertos = 0;
        foreach (var p in perguntas)
        {
            var (posicao, falha) = await Avaliar(sp, instituicao.Id, p, saida);
            if (falha is not null) return [falha];
            if (posicao > 0) acertos++;
        }
        saida.WriteLine($"{acertos}/{perguntas.Count}");
        return [];
    }

    static async Task<List<string>> ValidarPerguntas(OneDb db, List<PerguntaAvaliacao> perguntas)
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

    static async Task<(int, string?)> Avaliar(IServiceProvider sp, long instituicaoId, PerguntaAvaliacao p, TextWriter saida)
    {
        float[] vetor;
        try { vetor = (await sp.GetRequiredService<Embeddings>().Gerar([Mascara.Aplicar(p.Pergunta!)]))[0]; }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or InvalidOperationException or JsonException)
        {
            return (0, $"embeddings: falha ao gerar o vetor da pergunta \"{p.Pergunta}\" ({e.Message})");
        }
        var buscadas = await sp.GetRequiredService<Assistente.Assistente>().Buscar(vetor, instituicaoId);
        var posicao = buscadas.FindIndex(f => f.Titulo == p.Fonte) + 1;
        var lista = string.Join(" | ", buscadas.Select(f => $"{f.Titulo} ({f.Distancia.ToString("0.000", System.Globalization.CultureInfo.InvariantCulture)})"));
        saida.WriteLine(posicao > 0 ? $"acerto {posicao}: {p.Pergunta} -> {lista}" : $"erro: {p.Pergunta} (esperado \"{p.Fonte}\") -> {lista}");
        return (posicao, null);
    }
}

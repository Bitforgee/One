using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Assistente;
using One.Api.Conhecimento;

namespace One.Api.Instituicoes;

public static partial class InstituicaoComando
{
    public static async Task<int> Executar(IServiceProvider servicos, string[] args, TextWriter saida, TextWriter erro)
    {
        using var scope = servicos.CreateScope();
        var sp = scope.ServiceProvider;
        var opcoes = new Dictionary<string, string>();
        for (var i = 1; i + 1 < args.Length; i += 2)
            if (args[i].StartsWith("--")) opcoes[args[i][2..]] = args[i + 1];

        var erros = args.FirstOrDefault() switch
        {
            "criar" => await Criar(sp, opcoes, saida),
            "carga" => await Carga(sp, opcoes, saida),
            "avaliar-busca" => await AvaliarBusca(sp, opcoes, saida),
            _ => ["uso: instituicao criar --slug --nome --fuso --admin-cpf --admin-nome --admin-email | instituicao carga --slug --arquivo | instituicao avaliar-busca --slug --arquivo"],
        };
        foreach (var e in erros) erro.WriteLine(e);
        return erros.Count == 0 ? 0 : 1;
    }

    [GeneratedRegex("^[a-z0-9-]{3,30}$")] private static partial Regex SlugValido();

    record NovaInstituicao(string Slug, string Nome, string Fuso, string? Cpf, string AdminNome, string Email);

    static async Task<List<string>> ValidarCriacao(OneDb db, NovaInstituicao n)
    {
        var erros = new List<string>();
        if (!SlugValido().IsMatch(n.Slug)) erros.Add($"--slug: \"{n.Slug}\" deve casar com ^[a-z0-9-]{{3,30}}$");
        else if (await db.Instituicoes.AnyAsync(i => i.Slug == n.Slug)) erros.Add($"--slug: \"{n.Slug}\" já existe");
        if (n.Nome == "") erros.Add("--nome: obrigatório");
        if (!(TimeZoneInfo.TryFindSystemTimeZoneById(n.Fuso, out var tz) && tz.HasIanaId)) erros.Add($"--fuso: \"{n.Fuso}\" não é um fuso IANA (ex.: America/Cuiaba)");
        if (n.Cpf is null) erros.Add("--admin-cpf: CPF inválido");
        if (n.AdminNome == "") erros.Add("--admin-nome: obrigatório");
        if (!Email.Valido().IsMatch(n.Email)) erros.Add($"--admin-email: \"{n.Email}\" não é um e-mail válido");
        return erros;
    }

    static async Task<List<string>> Criar(IServiceProvider sp, Dictionary<string, string> o, TextWriter saida)
    {
        var db = sp.GetRequiredService<OneDb>();
        var agora = sp.GetRequiredService<TimeProvider>().GetUtcNow().UtcDateTime;
        string Valor(string chave) => o.GetValueOrDefault(chave)?.Trim() ?? "";
        var n = new NovaInstituicao(Valor("slug"), Valor("nome"), Valor("fuso"), Cpf.Normalizar(Valor("admin-cpf")), Valor("admin-nome"), Valor("admin-email"));
        var erros = await ValidarCriacao(db, n);
        if (erros.Count > 0) return erros;

        await using var tx = await db.Database.BeginTransactionAsync();
        var instituicao = new Instituicao { Slug = n.Slug, Nome = n.Nome, Fuso = n.Fuso, CriadaEm = agora };
        db.Instituicoes.Add(instituicao);
        await db.SaveChangesAsync();
        db.InstituicaoAtual = instituicao.Id;

        db.Setores.Add(new Setor { Nome = "Triagem", Triagem = true });
        db.Categorias.Add(new Categoria { Nome = "Não classificado", Padrao = true });
        var admin = new Usuario { Cpf = n.Cpf!, Nome = n.AdminNome, Email = n.Email, Papeis = [new UsuarioPapel { Papel = Papeis.Administrador }] };
        db.Usuarios.Add(admin);
        await db.SaveChangesAsync();
        var (token, registro) = Tokens.Novo(n.Slug, admin.Id, agora);
        db.Tokens.Add(registro);
        await db.SaveChangesAsync();
        await tx.CommitAsync();

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
        var existentes = new Existentes(await db.Setores.ToDictionaryAsync(s => s.Nome), await db.Categorias.ToDictionaryAsync(c => c.Nome),
            (await db.Cursos.Select(c => c.Nome).ToListAsync()).ToHashSet(), await db.Regras.Select(r => r.CategoriaId).ToListAsync());
        var (erros, plano) = CargaValidacao.Validar(arq, existentes);
        if (erros.Count > 0) return erros;

        var (setores, categorias) = await Gravar(db, arq, existentes, plano, sp.GetRequiredService<TimeProvider>().GetUtcNow().UtcDateTime);
        saida.WriteLine($"setores: {setores}");
        saida.WriteLine($"cursos: {plano.Cursos.Count}");
        saida.WriteLine($"categorias: {categorias}");
        saida.WriteLine($"regras: {plano.Regras.Count}");
        saida.WriteLine($"artigos: {plano.Artigos.Count}");
        return [];
    }

    static async Task<(int, int)> Gravar(OneDb db, ArquivoCarga arq, Existentes existentes, Plano plano, DateTime agora)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var novosSetores = plano.Setores.Values.Except(existentes.Setores.Values).ToList();
        var novasCategorias = plano.Categorias.Values.Except(existentes.Categorias.Values).ToList();
        db.Setores.AddRange(novosSetores);
        db.Categorias.AddRange(novasCategorias);
        await db.SaveChangesAsync();
        foreach (var (c, i) in (arq.Cursos ?? []).Select((c, i) => (c, i)))
            plano.Cursos[i].SetorCoordenacaoId = c.Coordenacao is null ? null : plano.Setores[c.Coordenacao].Id;
        db.Cursos.AddRange(plano.Cursos);
        foreach (var (regra, categoria, setor) in plano.Regras)
        {
            regra.CategoriaId = categoria.Id;
            regra.SetorId = setor?.Id;
            db.Regras.Add(regra);
        }
        foreach (var (a, categoria) in plano.Artigos)
        {
            var versao = new VersaoArtigo { Numero = 1, Titulo = a.Titulo!, Perguntas = a.Perguntas!, Resposta = a.Resposta!, Links = a.Links ?? [], CriadaEm = agora };
            var artigo = Artigo.Criar(categoria.Id, null, null, versao);
            artigo.Ativar();
            db.Artigos.Add(artigo);
            db.TrechosFonte.Add(Fontes.DoArtigo(versao, agora));
        }
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return (novosSetores.Count, novasCategorias.Count);
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

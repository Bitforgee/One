using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Comando;

// Comando do operador da plataforma: `dotnet One.Api.dll instituicao criar|carga ...`. Sai com 0 ou 1.
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
            _ => ["uso: instituicao criar --slug --nome --fuso --admin-cpf --admin-nome --admin-email | instituicao carga --slug --arquivo"],
        };
        foreach (var e in erros) erro.WriteLine(e);
        return erros.Count == 0 ? 0 : 1;
    }

    [GeneratedRegex("^[a-z0-9-]{3,30}$")] private static partial Regex SlugValido();
    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")] private static partial Regex EmailValido();

    static async Task<List<string>> Criar(IServiceProvider sp, Dictionary<string, string> o, TextWriter saida)
    {
        var db = sp.GetRequiredService<OneDb>();
        var agora = sp.GetRequiredService<TimeProvider>().GetUtcNow().UtcDateTime;
        string Valor(string chave) => o.GetValueOrDefault(chave)?.Trim() ?? "";
        var (slug, nome, fuso, cpf, adminNome, email) = (Valor("slug"), Valor("nome"), Valor("fuso"), Cpf.Normalizar(Valor("admin-cpf")), Valor("admin-nome"), Valor("admin-email"));

        var erros = new List<string>();
        if (!SlugValido().IsMatch(slug)) erros.Add($"--slug: \"{slug}\" deve casar com ^[a-z0-9-]{{3,30}}$");
        else if (await db.Instituicoes.AnyAsync(i => i.Slug == slug)) erros.Add($"--slug: \"{slug}\" já existe");
        if (nome == "") erros.Add("--nome: obrigatório");
        if (!(TimeZoneInfo.TryFindSystemTimeZoneById(fuso, out var tz) && tz.HasIanaId)) erros.Add($"--fuso: \"{fuso}\" não é um fuso IANA (ex.: America/Cuiaba)");
        if (cpf is null) erros.Add("--admin-cpf: CPF inválido");
        if (adminNome == "") erros.Add("--admin-nome: obrigatório");
        if (!EmailValido().IsMatch(email)) erros.Add($"--admin-email: \"{email}\" não é um e-mail válido");
        if (erros.Count > 0) return erros;

        await using var tx = await db.Database.BeginTransactionAsync();
        var instituicao = new Instituicao { Slug = slug, Nome = nome, Fuso = fuso, CriadaEm = agora };
        db.Instituicoes.Add(instituicao);
        await db.SaveChangesAsync();
        db.InstituicaoAtual = instituicao.Id;

        db.Setores.Add(new Setor { Nome = "Triagem", Triagem = true });
        db.Categorias.Add(new Categoria { Nome = "Não classificado", Padrao = true });
        var admin = new Usuario { Cpf = cpf!, Nome = adminNome, Email = email, Papeis = [new UsuarioPapel { Papel = Papeis.Administrador }] };
        db.Usuarios.Add(admin);
        await db.SaveChangesAsync();
        var (token, registro) = Tokens.Novo(slug, admin.Id, agora);
        db.Tokens.Add(registro);
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        saida.WriteLine($"Instituição {slug} criada.");
        saida.WriteLine($"Link de primeiro acesso do administrador (vale 60 minutos): {Tokens.Link(sp.GetRequiredService<IConfiguration>(), slug, token)}");
        return [];
    }

    record ArquivoCarga(List<SetorCarga>? Setores, List<CursoCarga>? Cursos, List<CategoriaCarga>? Categorias, List<RegraCarga>? Regras, List<ArtigoCarga>? Artigos);
    record SetorCarga(string? Nome);
    record CursoCarga(string? Nome, string? Coordenacao);
    record CategoriaCarga(string? Nome);
    record RegraCarga(string? Categoria, string? Setor, bool CoordenacaoDoCurso);
    record ArtigoCarga(string? Titulo, List<string>? Perguntas, string? Categoria, string? Resposta, List<string>? Links);

    static async Task<List<string>> Carga(IServiceProvider sp, Dictionary<string, string> o, TextWriter saida)
    {
        var db = sp.GetRequiredService<OneDb>();
        var agora = sp.GetRequiredService<TimeProvider>().GetUtcNow().UtcDateTime;
        var slug = o.GetValueOrDefault("slug") ?? "";
        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == slug);
        if (instituicao is null) return [$"--slug: instituição \"{slug}\" não existe"];
        if (!File.Exists(o.GetValueOrDefault("arquivo"))) return [$"--arquivo: arquivo \"{o.GetValueOrDefault("arquivo")}\" não encontrado"];

        ArquivoCarga? arq;
        try { arq = JsonSerializer.Deserialize<ArquivoCarga>(await File.ReadAllTextAsync(o["arquivo"]), JsonSerializerOptions.Web); }
        catch (JsonException e) { return [$"--arquivo: JSON inválido ({e.Message})"]; }
        if (arq is null) return ["--arquivo: vazio"];

        db.InstituicaoAtual = instituicao.Id;
        var setoresExistentes = await db.Setores.ToDictionaryAsync(s => s.Nome);
        var categoriasExistentes = await db.Categorias.ToDictionaryAsync(c => c.Nome);
        var comRegra = await db.Regras.Select(r => r.CategoriaId).ToListAsync();

        var erros = new List<string>();
        var setores = new Dictionary<string, Setor>(setoresExistentes);
        foreach (var (s, i) in (arq.Setores ?? []).Select((s, i) => (s, i)))
        {
            if (string.IsNullOrWhiteSpace(s.Nome)) erros.Add($"setores[{i}].nome: obrigatório");
            else if (setores.ContainsKey(s.Nome)) erros.Add($"setores[{i}].nome: \"{s.Nome}\" repetido");
            else setores[s.Nome] = new Setor { Nome = s.Nome };
        }
        var categorias = new Dictionary<string, Categoria>(categoriasExistentes);
        foreach (var (c, i) in (arq.Categorias ?? []).Select((c, i) => (c, i)))
        {
            if (string.IsNullOrWhiteSpace(c.Nome)) erros.Add($"categorias[{i}].nome: obrigatório");
            else if (categorias.ContainsKey(c.Nome)) erros.Add($"categorias[{i}].nome: \"{c.Nome}\" repetida");
            else categorias[c.Nome] = new Categoria { Nome = c.Nome };
        }
        var cursos = new List<Curso>();
        foreach (var (c, i) in (arq.Cursos ?? []).Select((c, i) => (c, i)))
        {
            if (string.IsNullOrWhiteSpace(c.Nome)) erros.Add($"cursos[{i}].nome: obrigatório");
            if (c.Coordenacao is not null && !setores.ContainsKey(c.Coordenacao)) erros.Add($"cursos[{i}].coordenacao: setor \"{c.Coordenacao}\" não existe");
            cursos.Add(new Curso { Nome = c.Nome ?? "" });
        }
        var regras = new List<(RegraRoteamento regra, Categoria categoria, Setor? setor)>();
        foreach (var (r, i) in (arq.Regras ?? []).Select((r, i) => (r, i)))
        {
            if (r.Categoria is null || !categorias.TryGetValue(r.Categoria, out var categoria)) { erros.Add($"regras[{i}].categoria: categoria \"{r.Categoria}\" não existe"); continue; }
            if (comRegra.Contains(categoria.Id) || regras.Any(x => x.categoria == categoria)) erros.Add($"regras[{i}].categoria: \"{r.Categoria}\" já tem regra");
            Setor? setor = null;
            if (r.CoordenacaoDoCurso == (r.Setor is not null)) erros.Add($"regras[{i}]: informe setor ou coordenacaoDoCurso, um dos dois");
            else if (r.Setor is not null && !setores.TryGetValue(r.Setor, out setor)) erros.Add($"regras[{i}].setor: setor \"{r.Setor}\" não existe");
            regras.Add((new RegraRoteamento { Destino = r.CoordenacaoDoCurso ? "COORDENACAO_CURSO" : "SETOR" }, categoria, setor));
        }
        var artigos = new List<(ArtigoCarga a, Categoria categoria)>();
        foreach (var (a, i) in (arq.Artigos ?? []).Select((a, i) => (a, i)))
        {
            if (string.IsNullOrWhiteSpace(a.Titulo)) erros.Add($"artigos[{i}].titulo: obrigatório");
            if (a.Perguntas is null || a.Perguntas.Count == 0 || a.Perguntas.Any(string.IsNullOrWhiteSpace)) erros.Add($"artigos[{i}].perguntas: informe ao menos uma pergunta");
            if (string.IsNullOrWhiteSpace(a.Resposta)) erros.Add($"artigos[{i}].resposta: obrigatória");
            foreach (var (l, j) in (a.Links ?? []).Select((l, j) => (l, j)))
                if (!l.StartsWith("https://") && !l.StartsWith("http://")) erros.Add($"artigos[{i}].links[{j}]: deve começar com https:// ou http://");
            if (a.Categoria is null || !categorias.TryGetValue(a.Categoria, out var categoria)) erros.Add($"artigos[{i}].categoria: categoria \"{a.Categoria}\" não existe");
            else artigos.Add((a, categoria));
        }
        if (erros.Count > 0) return erros;

        await using var tx = await db.Database.BeginTransactionAsync();
        var novosSetores = setores.Values.Except(setoresExistentes.Values).ToList();
        var novasCategorias = categorias.Values.Except(categoriasExistentes.Values).ToList();
        db.Setores.AddRange(novosSetores);
        db.Categorias.AddRange(novasCategorias);
        await db.SaveChangesAsync();
        foreach (var (c, i) in (arq.Cursos ?? []).Select((c, i) => (c, i)))
            cursos[i].SetorCoordenacaoId = c.Coordenacao is null ? null : setores[c.Coordenacao].Id;
        db.Cursos.AddRange(cursos);
        foreach (var (regra, categoria, setor) in regras)
        {
            regra.CategoriaId = categoria.Id;
            regra.SetorId = setor?.Id;
            db.Regras.Add(regra);
        }
        foreach (var (a, categoria) in artigos)
            db.Artigos.Add(new Artigo
            {
                CategoriaId = categoria.Id,
                Estado = EstadosArtigo.Ativo,
                Versoes = [new VersaoArtigo { Numero = 1, Titulo = a.Titulo!, Perguntas = a.Perguntas!, Resposta = a.Resposta!, Links = a.Links ?? [], CriadaEm = agora }],
            });
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        saida.WriteLine($"setores: {novosSetores.Count}");
        saida.WriteLine($"cursos: {cursos.Count}");
        saida.WriteLine($"categorias: {novasCategorias.Count}");
        saida.WriteLine($"regras: {regras.Count}");
        saida.WriteLine($"artigos: {artigos.Count}");
        return [];
    }
}

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Instituicoes;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class InstituicaoComandoTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<(int codigo, string saida, string erro)> Rodar(params string[] args)
    {
        var (saida, erro) = (new StringWriter(), new StringWriter());
        var codigo = await InstituicaoComando.Executar(f.Services, args, saida, erro);
        return (codigo, saida.ToString(), erro.ToString());
    }

    static string[] Trocar(string[] args, string flag, string valor)
    {
        var copia = (string[])args.Clone();
        copia[Array.IndexOf(copia, flag) + 1] = valor;
        return copia;
    }

    static string[] Criar(string slug, string fuso = "America/Cuiaba", string? cpf = null, string email = "admin@univag.edu.br") =>
        ["criar", "--slug", slug, "--nome", "Univag", "--fuso", fuso, "--admin-cpf", cpf ?? Semente.NovoCpf(), "--admin-nome", "Coordenadora", "--admin-email", email];

    Task<int[]> Contagens() => f.Db(null, async db => new[]
    {
        await db.Instituicoes.CountAsync(),
        await db.Usuarios.IgnoreQueryFilters().CountAsync(),
        await db.UsuarioPapeis.IgnoreQueryFilters().CountAsync(),
        await db.Setores.IgnoreQueryFilters().CountAsync(),
        await db.Cursos.IgnoreQueryFilters().CountAsync(),
        await db.Categorias.IgnoreQueryFilters().CountAsync(),
        await db.Fluxos.IgnoreQueryFilters().CountAsync(),
        await db.Artigos.IgnoreQueryFilters().CountAsync(),
        await db.VersoesArtigo.IgnoreQueryFilters().CountAsync(),
        await db.Tokens.IgnoreQueryFilters().CountAsync(),
    });

    [Fact]
    public async Task Criar_valido_sai_0()
    {
        var cpf = Semente.NovoCpf();
        var (codigo, saida, _) = await Rodar(Criar("univag", cpf: cpf));

        Assert.Equal(0, codigo);
        var link = saida.Split('\n').Select(l => l.Trim()).Single(l => l.Contains("/univag/definir-senha?token="));
        var token = link[(link.IndexOf("token=") + 6)..];

        var i = await f.Db(null, db => db.Instituicoes.SingleAsync(x => x.Slug == "univag"));
        Assert.True(i.Ativa);
        Assert.Equal("Univag", i.Nome);
        Assert.Equal("America/Cuiaba", i.Fuso);
        await f.Db(i.Id, async db =>
        {
            var setor = await db.Setores.SingleAsync();
            Assert.Equal("Triagem", setor.Nome);
            Assert.True(setor.Triagem);
            Assert.Equal("Não classificado", (await db.Categorias.SingleAsync()).Nome);
            var admin = await db.Usuarios.Include(u => u.Papeis).SingleAsync();
            Assert.Equal(cpf, admin.Cpf);
            Assert.Null(admin.SenhaHash);
            Assert.True(admin.Ativo);
            Assert.Equal([Papeis.Administrador], admin.Papeis.Select(p => p.Papel));
            var registro = await db.Tokens.SingleAsync();
            Assert.Equal(Tokens.Hash(token), registro.Hash);
            Assert.Equal(admin.Id, registro.UsuarioId);
            Assert.Equal(f.Relogio.GetUtcNow().UtcDateTime.AddMinutes(60), registro.ExpiraEm);
        });
    }

    public static TheoryData<string, string> Invalidos => new()
    {
        { "slug fora do padrão", "--slug" },
        { "slug já existente", "--slug" },
        { "fuso não IANA", "--fuso" },
        { "CPF com dígito errado", "--admin-cpf" },
        { "e-mail sem @", "--admin-email" },
        { "nome vazio", "--nome" },
        { "nome do administrador vazio", "--admin-nome" },
        { "slug com 2 caracteres", "--slug" },
        { "slug com 31 caracteres", "--slug" },
        { "fuso sem id IANA", "--fuso" },
    };

    [Theory]
    [MemberData(nameof(Invalidos))]
    public async Task Criar_invalido_sai_1(string caso, string campo)
    {
        var existente = Semente.NovoSlug();
        Assert.Equal(0, (await Rodar(Criar(existente))).codigo);
        var cpfValido = Semente.NovoCpf();
        var cpfErrado = cpfValido[..10] + (char)('0' + (cpfValido[10] - '0' + 1) % 10);
        var args = caso switch
        {
            "slug fora do padrão" => Criar("Uni"),
            "slug já existente" => Criar(existente),
            "fuso não IANA" => Criar(Semente.NovoSlug(), fuso: "Cuiaba"),
            "CPF com dígito errado" => Criar(Semente.NovoSlug(), cpf: cpfErrado),
            "nome vazio" => Trocar(Criar(Semente.NovoSlug()), "--nome", ""),
            "nome do administrador vazio" => Trocar(Criar(Semente.NovoSlug()), "--admin-nome", ""),
            "slug com 2 caracteres" => Criar("ab"),
            "slug com 31 caracteres" => Criar(new string('a', 31)),
            "fuso sem id IANA" => Criar(Semente.NovoSlug(), fuso: "E. South America Standard Time"),
            _ => Criar(Semente.NovoSlug(), email: "admin.univag.edu.br"),
        };
        var antes = await Contagens();

        var (codigo, saida, erro) = await Rodar(args);

        Assert.Equal(1, codigo);
        Assert.Contains(campo, erro);
        Assert.DoesNotContain("token=", saida);
        Assert.Equal(antes, await Contagens());
    }

    static string Arquivo(object conteudo)
    {
        var caminho = Path.Combine(Path.GetTempPath(), $"carga-{Guid.NewGuid():N}.json");
        File.WriteAllText(caminho, JsonSerializer.Serialize(conteudo));
        return caminho;
    }

    static object Carga(string categoriaDoTerceiroArtigo = "Boleto") => new
    {
        setores = new[] { new { nome = "Financeiro" }, new { nome = "Coordenação ADS" } },
        cursos = new[] { new { nome = "ADS", coordenacao = "Coordenação ADS" } },
        categorias = new[] { new { nome = "Boleto" }, new { nome = "Notas" } },
        regras = new object[] { new { categoria = "Boleto", setor = "Financeiro" }, new { categoria = "Notas", coordenacaoDoCurso = true } },
        artigos = new[]
        {
            new { titulo = "Como emitir o boleto do semestre", perguntas = new[] { "Onde tiro o boleto?" }, categoria = "Boleto", resposta = "O boleto fica no Portal do Aluno, menu Financeiro.", links = new[] { "https://portal.univag.edu.br" } },
            new { titulo = "Faltas não são abonadas", perguntas = new[] { "Posso abonar falta?" }, categoria = "Notas", resposta = "Faltas não são abonadas, nem com atestado.", links = Array.Empty<string>() },
            new { titulo = "Segunda via", perguntas = new[] { "Perdi o boleto" }, categoria = categoriaDoTerceiroArtigo, resposta = "Gere a segunda via no Portal do Aluno.", links = Array.Empty<string>() },
        },
    };

    [Fact]
    public async Task Carga_valida_sai_0()
    {
        var slug = Semente.NovoSlug();
        await Rodar(Criar(slug));

        var (codigo, saida, erro) = await Rodar("carga", "--slug", slug, "--arquivo", Arquivo(Carga()));

        Assert.Equal(0, codigo);
        Assert.Equal("", erro);
        foreach (var linha in new[] { "setores: 2", "cursos: 1", "categorias: 2", "regras: 2", "artigos: 3" })
            Assert.Contains(linha, saida);
        var i = await f.Db(null, db => db.Instituicoes.SingleAsync(x => x.Slug == slug));
        await f.Db(i.Id, async db =>
        {
            Assert.Equal(["Coordenação ADS", "Financeiro", "Triagem"], (await db.Setores.Select(s => s.Nome).ToListAsync()).Order());
            var curso = await db.Cursos.SingleAsync();
            Assert.Equal((await db.Setores.SingleAsync(s => s.Nome == "Coordenação ADS")).Id, curso.SetorCoordenacaoId);
            Assert.Equal(3, await db.Categorias.CountAsync());
            var fluxos = await db.Fluxos.Include(x => x.Versoes).ThenInclude(v => v.Etapas).ToListAsync();
            Assert.Equal(2, fluxos.Count);
            Assert.All(fluxos, x => Assert.Equal((null, null, 1, 1), (x.CursoId, x.Semestre, x.Vigente!.Numero, x.Vigente.Etapas.Count)));
            var etapas = fluxos.Select(x => x.Vigente!.Etapas.Single()).ToList();
            Assert.Contains(etapas, e => e.Destino == "SETOR" && e.SetorId != null);
            Assert.Contains(etapas, e => e.Destino == "COORDENACAO_CURSO" && e.SetorId == null);
            var artigos = await db.Artigos.Include(a => a.Versoes).ToListAsync();
            Assert.Equal(3, artigos.Count);
            Assert.All(artigos, a => Assert.Equal(EstadosArtigo.Ativo, a.Estado));
            Assert.All(artigos, a => Assert.Equal(1, Assert.Single(a.Versoes).Numero));
        });
    }

    [Fact]
    public async Task Carga_continua_com_a_mesma_saida()
    {
        var slug = Semente.NovoSlug();
        await Rodar(Criar(slug));

        var (codigo, saida, erro) = await Rodar("carga", "--slug", slug, "--arquivo", Arquivo(Carga()));

        Assert.Equal((0, ""), (codigo, erro));
        foreach (var linha in new[] { "setores: 2", "cursos: 1", "categorias: 2", "regras: 2", "artigos: 3" })
            Assert.Contains(linha, saida);
        var i = await f.Db(null, db => db.Instituicoes.SingleAsync(x => x.Slug == slug));
        Assert.Equal(2, await f.Db(i.Id, db => db.VersoesFluxo.CountAsync(v => v.PublicadaEm != null)));
        Assert.Equal(2, await f.Db(i.Id, db => db.EtapasFluxo.CountAsync()));
    }
    [Fact]
    public async Task Carga_cada_recusa_sai_1()
    {
        var slug = Semente.NovoSlug();
        await Rodar(Criar(slug));
        const string artigo = "\"titulo\":\"T\",\"perguntas\":[\"P?\"],\"categoria\":\"Não classificado\",\"resposta\":\"R\",\"links\":[]";
        string Artigo(string troca) => "{\"artigos\":[{" + troca + "}]}";
        var casos = new (string json, string caminho)[]
        {
            ("{\"setores\":[{\"nome\":\"\"}]}", "setores[0].nome"),
            ("{\"setores\":[{\"nome\":\"A\"},{\"nome\":\"A\"}]}", "setores[1].nome"),
            ("{\"setores\":[{\"nome\":\"Triagem\"}]}", "setores[0].nome"),
            ("{\"categorias\":[{\"nome\":\" \"}]}", "categorias[0].nome"),
            ("{\"categorias\":[{\"nome\":\"B\"},{\"nome\":\"B\"}]}", "categorias[1].nome"),
            ("{\"cursos\":[{\"nome\":\"\"}]}", "cursos[0].nome"),
            ("{\"cursos\":[{\"nome\":\"ADS\",\"coordenacao\":\"Nenhum\"}]}", "cursos[0].coordenacao"),
            ("{\"regras\":[{\"categoria\":\"Nenhuma\",\"coordenacaoDoCurso\":true}]}", "regras[0].categoria"),
            ("{\"categorias\":[{\"nome\":\"B\"}],\"regras\":[{\"categoria\":\"B\",\"coordenacaoDoCurso\":true},{\"categoria\":\"B\",\"coordenacaoDoCurso\":true}]}", "regras[1].categoria"),
            ("{\"setores\":[{\"nome\":\"S\"}],\"categorias\":[{\"nome\":\"B\"}],\"regras\":[{\"categoria\":\"B\",\"setor\":\"S\",\"coordenacaoDoCurso\":true}]}", "regras[0]:"),
            ("{\"categorias\":[{\"nome\":\"B\"}],\"regras\":[{\"categoria\":\"B\"}]}", "regras[0]:"),
            ("{\"categorias\":[{\"nome\":\"B\"}],\"regras\":[{\"categoria\":\"B\",\"setor\":\"Nenhum\"}]}", "regras[0].setor"),
            (Artigo(artigo.Replace("\"titulo\":\"T\"", "\"titulo\":\"\"")), "artigos[0].titulo"),
            (Artigo(artigo.Replace("[\"P?\"]", "[]")), "artigos[0].perguntas"),
            (Artigo(artigo.Replace("\"resposta\":\"R\"", "\"resposta\":\" \"")), "artigos[0].resposta"),
            (Artigo(artigo.Replace("\"links\":[]", "\"links\":[\"www.x.com\"]")), "artigos[0].links[0]"),
            (Artigo(artigo.Replace("Não classificado", "Nenhuma")), "artigos[0].categoria"),
            ("{ não é json", "--arquivo"),
            ("null", "--arquivo: vazio"),
            (Artigo(artigo.Replace("[\"P?\"]", "[\"P?\",\" \"]")), "artigos[0].perguntas"),
            ("{\"cursos\":[{\"nome\":\"ADS\"},{\"nome\":\"ADS\"}]}", "cursos[1].nome"),
        };
        var antes = await Contagens();

        foreach (var (json, caminho) in casos)
        {
            var arquivo = Path.Combine(Path.GetTempPath(), $"carga-{Guid.NewGuid():N}.json");
            File.WriteAllText(arquivo, json);
            var (codigo, saida, erro) = await Rodar("carga", "--slug", slug, "--arquivo", arquivo);
            Assert.True(codigo == 1, $"{caminho}: saiu {codigo}");
            Assert.StartsWith(caminho, Assert.Single(erro.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)));
            Assert.Equal("", saida);
        }
        var semInstituicao = await Rodar("carga", "--slug", "nao-existe", "--arquivo", Arquivo(Carga()));
        Assert.Equal(1, semInstituicao.codigo);
        Assert.StartsWith("--slug: instituição \"nao-existe\" não existe", semInstituicao.erro);
        var semArquivo = await Rodar("carga", "--slug", slug, "--arquivo", Path.Combine(Path.GetTempPath(), "nao-existe.json"));
        Assert.Equal(1, semArquivo.codigo);
        Assert.StartsWith("--arquivo: arquivo", semArquivo.erro);
        Assert.Contains("não encontrado", semArquivo.erro);
        Assert.Equal(antes, await Contagens());

        var categoria = Path.Combine(Path.GetTempPath(), $"carga-{Guid.NewGuid():N}.json");
        File.WriteAllText(categoria, "{\"categorias\":[{\"nome\":\"Boleto\"}],\"regras\":[{\"categoria\":\"Boleto\",\"coordenacaoDoCurso\":true}]}");
        Assert.Equal(0, (await Rodar("carga", "--slug", slug, "--arquivo", categoria)).codigo);
        var depois = await Contagens();
        var regraDeNovo = Path.Combine(Path.GetTempPath(), $"carga-{Guid.NewGuid():N}.json");
        File.WriteAllText(regraDeNovo, "{\"regras\":[{\"categoria\":\"Boleto\",\"coordenacaoDoCurso\":true}]}");
        var repetida = await Rodar("carga", "--slug", slug, "--arquivo", regraDeNovo);
        Assert.Equal(1, repetida.codigo);
        Assert.StartsWith("regras[0].categoria", repetida.erro);
        Assert.Contains("já tem regra", repetida.erro);
        Assert.Equal(depois, await Contagens());

        var comCurso = Path.Combine(Path.GetTempPath(), $"carga-{Guid.NewGuid():N}.json");
        File.WriteAllText(comCurso, "{\"cursos\":[{\"nome\":\"Direito\"}]}");
        Assert.Equal(0, (await Rodar("carga", "--slug", slug, "--arquivo", comCurso)).codigo);
        var antesDosRepetidos = await Contagens();
        foreach (var (json, caminho) in new[]
        {
            ("{\"cursos\":[{\"nome\":\"Direito\"}]}", "cursos[0].nome"),
            ("{\"categorias\":[{\"nome\":\"Não classificado\"}]}", "categorias[0].nome"),
        })
        {
            var arquivo = Path.Combine(Path.GetTempPath(), $"carga-{Guid.NewGuid():N}.json");
            File.WriteAllText(arquivo, json);
            var (codigo, _, erro) = await Rodar("carga", "--slug", slug, "--arquivo", arquivo);
            Assert.True(codigo == 1, $"{caminho}: saiu {codigo}");
            Assert.StartsWith(caminho, erro);
            Assert.Contains("repetid", erro);
        }
        Assert.Equal(antesDosRepetidos, await Contagens());

        foreach (var args in new[] { new[] { "apagar" }, Array.Empty<string>() })
        {
            var (codigo, _, erro) = await Rodar(args);
            Assert.Equal(1, codigo);
            Assert.StartsWith("uso: instituicao criar", erro);
        }
    }

    [Fact]
    public async Task Carga_invalida_nao_grava_nada()
    {
        var slug = Semente.NovoSlug();
        await Rodar(Criar(slug));
        var antes = await Contagens();

        var (codigo, saida, erro) = await Rodar("carga", "--slug", slug, "--arquivo", Arquivo(Carga(categoriaDoTerceiroArtigo: "Inexistente")));

        Assert.Equal(1, codigo);
        var linhas = erro.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var linha = Assert.Single(linhas);
        Assert.StartsWith("artigos[2].categoria", linha);
        Assert.Contains("não existe", linha);
        Assert.Equal("", saida);
        Assert.Equal(antes, await Contagens());
    }

    [Fact]
    public async Task Slug_nao_muda()
    {
        var slug = Semente.NovoSlug();
        await Rodar(Criar(slug));
        var id = await f.Db(null, async db => (await db.Instituicoes.SingleAsync(x => x.Slug == slug)).Id);

        await Assert.ThrowsAnyAsync<Exception>(() => f.Db(null, async db =>
        {
            await db.Instituicoes.Where(x => x.Id == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Slug, "outro-slug"));
        }));

        Assert.Equal(slug, await f.Db(null, db => db.Instituicoes.Where(x => x.Id == id).Select(x => x.Slug).SingleAsync()));
    }
}

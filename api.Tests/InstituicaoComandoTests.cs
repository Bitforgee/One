using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Comando;
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
        await db.Regras.IgnoreQueryFilters().CountAsync(),
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
            var regras = await db.Regras.ToListAsync();
            Assert.Equal(2, regras.Count);
            Assert.Contains(regras, r => r.Destino == "SETOR" && r.SetorId != null);
            Assert.Contains(regras, r => r.Destino == "COORDENACAO_CURSO" && r.SetorId == null);
            var artigos = await db.Artigos.Include(a => a.Versoes).ToListAsync();
            Assert.Equal(3, artigos.Count);
            Assert.All(artigos, a => Assert.Equal(EstadosArtigo.Ativo, a.Estado));
            Assert.All(artigos, a => Assert.Equal(1, Assert.Single(a.Versoes).Numero));
        });
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
            var i = await db.Instituicoes.SingleAsync(x => x.Id == id);
            i.Slug = "outro-slug";
            await db.SaveChangesAsync();
        }));

        Assert.Equal(slug, await f.Db(null, db => db.Instituicoes.Where(x => x.Id == id).Select(x => x.Slug).SingleAsync()));
    }
}

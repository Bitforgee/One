using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Npgsql;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class ArquiteturaTests(OneFactory f) : IClassFixture<OneFactory>
{
    static readonly string[] TabelasDaInstituicao =
    [
        "usuario", "usuario_papel", "setor", "atendente_setor", "curso", "matricula", "categoria", "regra_roteamento",
        "artigo", "versao_artigo", "token_acesso", "conversa", "mensagem_conversa", "citacao_artigo", "chamado",
        "mensagem_chamado", "anexo", "evento_chamado", "resposta_pronta", "email_saida",
        "documento", "versao_documento", "trecho_fonte",
    ];

    public static string Raiz()
    {
        var d = new DirectoryInfo(AppContext.BaseDirectory);
        while (!File.Exists(Path.Combine(d!.FullName, "One.slnx"))) d = d.Parent;
        return d.FullName;
    }

    async Task<List<(string tabela, string coluna, string tipo, bool nula)>> Colunas()
    {
        await using var con = new NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        await using var cmd = new NpgsqlCommand("""
            SELECT table_name, column_name, data_type, is_nullable = 'YES' FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name <> '__EFMigrationsHistory'
            """, con);
        await using var r = await cmd.ExecuteReaderAsync();
        var lista = new List<(string, string, string, bool)>();
        while (await r.ReadAsync()) lista.Add((r.GetString(0), r.GetString(1), r.GetString(2), r.GetBoolean(3)));
        return lista;
    }

    [Fact]
    public async Task Toda_entidade_tem_instituicao_e_filtro()
    {
        var modelo = await f.Db(null, db => Task.FromResult(db.Model));
        var entidades = modelo.GetEntityTypes().Where(e => e.ClrType != typeof(Instituicao)).ToList();

        Assert.Equal(TabelasDaInstituicao.Order(), entidades.Select(e => e.GetTableName()!).Order());
        foreach (var e in entidades)
        {
            var prop = e.FindProperty("InstituicaoId");
            Assert.True(prop is { IsNullable: false }, $"{e.GetTableName()} sem instituicao_id não nulo");
            Assert.Equal("instituicao_id", prop!.GetColumnName());
            Assert.Contains(e.GetForeignKeys(), fk => fk.PrincipalEntityType.ClrType == typeof(Instituicao) && fk.Properties.Single() == prop);
            Assert.NotEmpty(e.GetDeclaredQueryFilters());
        }

        var colunas = await Colunas();
        foreach (var t in TabelasDaInstituicao)
            Assert.Contains(colunas, c => c.tabela == t && c.coluna == "instituicao_id" && c.tipo == "bigint" && !c.nula);

        // o filtro funciona: a sessão de outra instituição não enxerga a linha
        var univag = await f.Instituicao();
        var demo = await f.Instituicao();
        Assert.Empty(await f.Db(demo.Id, db => db.Setores.Where(s => s.InstituicaoId == univag.Id).ToListAsync()));
        Assert.Single(await f.Db(univag.Id, db => db.Setores.ToListAsync()));
    }

    [Fact]
    public void IgnoreQueryFilters_so_no_agendador_e_no_comando()
    {
        var api = Path.Combine(Raiz(), "api");
        var permitidos = new[] { Path.Combine(api, "Comando", "InstituicaoComando.cs"), Path.Combine(api, "Agendador.cs") };
        var sep = Path.DirectorySeparatorChar;
        var usos = Directory.EnumerateFiles(api, "*.cs", SearchOption.AllDirectories)
            .Where(p => !p.Contains($"{sep}bin{sep}") && !p.Contains($"{sep}obj{sep}"))
            .Where(p => File.ReadAllText(p).Contains("IgnoreQueryFilters"));
        Assert.All(usos, p => Assert.Contains(p, permitidos));
    }

    [Fact]
    public void Layout_e_compose()
    {
        var raiz = Raiz();
        var compose = File.ReadAllText(Path.Combine(raiz, "docker-compose.yml"));
        Assert.Matches(new Regex(@"^\s+image:\s*pgvector/pgvector:0\.8\.7-pg18-trixie\s*$", RegexOptions.Multiline), compose); // RAG, doors R2 e R8
        Assert.Matches(new Regex(@"^\s+image:\s*axllent/mailpit\s*$", RegexOptions.Multiline), compose);

        var solucao = File.ReadAllText(Path.Combine(raiz, "One.slnx"));
        Assert.Contains("api/One.Api.csproj", solucao);
        Assert.Contains("api.Tests/One.Api.Tests.csproj", solucao);
        Assert.Contains("web/package.json", solucao);
        Assert.True(File.Exists(Path.Combine(raiz, "web", "package.json")));
        Assert.True(File.Exists(Path.Combine(raiz, "api", "One.Api.csproj")));
        Assert.True(File.Exists(Path.Combine(raiz, "api.Tests", "One.Api.Tests.csproj")));
    }

    [Fact]
    public async Task Tabelas_snake_case_e_datas_timestamptz()
    {
        var snake = new Regex("^[a-z][a-z0-9_]*$");
        var modelo = await f.Db(null, db => Task.FromResult(db.Model));
        foreach (var e in modelo.GetEntityTypes())
        {
            Assert.Matches(snake, e.GetTableName()!);
            var tabela = StoreObjectIdentifier.Table(e.GetTableName()!);
            foreach (var p in e.GetProperties())
            {
                Assert.Matches(snake, p.GetColumnName(tabela)!);
                if (p.ClrType == typeof(DateTime) || p.ClrType == typeof(DateTime?))
                    Assert.Equal("timestamp with time zone", p.GetColumnType());
            }
        }
        var colunas = await Colunas();
        Assert.All(colunas, c => Assert.Matches(snake, c.tabela));
        Assert.All(colunas, c => Assert.Matches(snake, c.coluna));
        Assert.All(colunas.Where(c => c.tipo.StartsWith("timestamp")), c => Assert.Equal("timestamp with time zone", c.tipo));
        Assert.Contains(colunas, c => c.tipo == "timestamp with time zone");
    }
}

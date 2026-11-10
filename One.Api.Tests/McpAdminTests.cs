using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class McpAdminTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string Rota = "/api/admin/mcp";
    const string RotaTokens = "/api/admin/mcp/tokens";

    async Task<(Instituicao, Usuario, HttpClient)> Admin(Instituicao? i = null)
    {
        i ??= await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Administrador]);
        return (i, u, await f.Entrar(i, u));
    }

    Task<List<TokenMcp>> Gravados(Instituicao i) => f.Db(i.Id, db => db.TokensMcp.AsNoTracking().OrderBy(t => t.Id).ToListAsync());

    static string Sha256(string texto) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(texto))).ToLowerInvariant();

    [Fact]
    public async Task Criar_devolve_o_token_uma_vez_e_grava_so_o_hash()
    {
        var (i, _, c) = await Admin();

        var r = await c.PostAsJsonAsync(RotaTokens, new { nome = "Cursor", dias = 90 });

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var j = await r.Json();
        Assert.Equal(["id", "nome", "token", "final", "criadoEm", "expiraEm"], j.EnumerateObject().Select(p => p.Name));
        var token = j.GetProperty("token").GetString()!;
        Assert.Matches(new Regex($@"^onemcp_{i.Slug}\.[A-Za-z0-9_-]{{43}}$"), token);
        Assert.Equal(token[^4..], j.GetProperty("final").GetString());
        Assert.Equal("Cursor", j.GetProperty("nome").GetString());
        var (criado, expira) = (j.GetProperty("criadoEm").GetDateTime(), j.GetProperty("expiraEm").GetDateTime());
        Assert.Equal(f.Relogio.GetUtcNow().UtcDateTime, criado.ToUniversalTime());
        Assert.Equal(TimeSpan.FromDays(90), expira - criado);

        var gravado = Assert.Single(await Gravados(i));
        Assert.Equal((Sha256(token), token[^4..], "Cursor"), (gravado.Hash, gravado.Final, gravado.Nome));
        var linhas = await f.Db(i.Id, db => db.Database.SqlQuery<string>($"SELECT t::text AS \"Value\" FROM token_mcp t WHERE t.instituicao_id = {i.Id}").ToListAsync());
        Assert.DoesNotContain(token, Assert.Single(linhas));
    }

    [Fact]
    public async Task Criar_valida_nome_e_dias()
    {
        var (i, _, c) = await Admin();
        var recusas = new (object corpo, string campo)[]
        {
            (new { nome = "", dias = 90 }, "nome"),
            (new { nome = "   ", dias = 90 }, "nome"),
            (new { nome = new string('n', 61), dias = 90 }, "nome"),
            (new { nome = "ok", dias = 29 }, "dias"),
            (new { nome = "ok", dias = 366 }, "dias"),
            (new { nome = "ok" }, "dias"),
        };
        foreach (var (corpo, campo) in recusas)
        {
            var r = await c.PostAsJsonAsync(RotaTokens, corpo);
            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
            Assert.True((await r.Json()).GetProperty("errors").TryGetProperty(campo, out _), campo);
        }
        Assert.Empty(await Gravados(i));

        foreach (var (nome, dias) in new[] { (new string('n', 60), 30), ("a", 90), ("b", 365) })
            Assert.Equal(HttpStatusCode.Created, (await c.PostAsJsonAsync(RotaTokens, new { nome, dias })).StatusCode);
        Assert.Equal(3, (await Gravados(i)).Count);
    }

    [Fact]
    public async Task Criar_limita_a_5_ativos_por_usuario()
    {
        var (i, admin, c) = await Admin();
        var ids = new List<long>();
        for (var n = 1; n <= 5; n++)
        {
            var r = await c.PostAsJsonAsync(RotaTokens, new { nome = $"t{n}", dias = 30 });
            Assert.Equal(HttpStatusCode.Created, r.StatusCode);
            ids.Add((await r.Json()).GetProperty("id").GetInt64());
        }

        var sexto = await c.PostAsJsonAsync(RotaTokens, new { nome = "t6", dias = 30 });
        Assert.Equal(HttpStatusCode.Conflict, sexto.StatusCode);
        Assert.Equal("Você já tem 5 tokens ativos. Revogue um para criar outro.", (await sexto.Json()).GetProperty("detail").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await c.DeleteAsync($"{RotaTokens}/{ids[0]}")).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await c.PostAsJsonAsync(RotaTokens, new { nome = "t7", dias = 30 })).StatusCode);
        await f.NovoTokenMcp(i, admin, dias: 1, agora: f.Relogio.GetUtcNow().UtcDateTime.AddDays(-10));
        Assert.Equal(HttpStatusCode.Conflict, (await c.PostAsJsonAsync(RotaTokens, new { nome = "t8", dias = 30 })).StatusCode);

        var outroAdmin = await f.Usuario(i, [Papeis.Administrador]);
        var outro = await f.Entrar(i, outroAdmin);
        Assert.Equal(HttpStatusCode.Created, (await outro.PostAsJsonAsync(RotaTokens, new { nome = "dele", dias = 30 })).StatusCode);
        Assert.Equal(8, (await Gravados(i)).Count);
    }

    [Fact]
    public async Task Listar_mostra_url_estados_e_nao_vaza_segredo()
    {
        var (i, admin, c) = await Admin();
        var agora = f.Relogio.GetUtcNow().UtcDateTime;
        var expirado = await f.NovoTokenMcp(i, admin, dias: 1, nome: "velho", agora: agora.AddDays(-10));
        var revogado = await f.NovoTokenMcp(i, admin, nome: "revogado", agora: agora.AddHours(-2));
        var ativo = await f.NovoTokenMcp(i, admin, nome: "ativo", agora: agora.AddHours(-1));
        await f.Db(i.Id, db => db.TokensMcp.Where(t => t.Nome == "revogado").ExecuteUpdateAsync(s => s.SetProperty(t => t.RevogadoEm, agora.AddHours(-1))));
        var (j, outroAdmin, _) = await Admin();
        await f.NovoTokenMcp(j, outroAdmin, nome: "de-outra-instituicao");

        var r = await c.GetAsync(Rota);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var corpo = await r.Json();
        Assert.Equal(["url", "tokens"], corpo.EnumerateObject().Select(p => p.Name));
        Assert.Equal($"http://localhost:8080/api/mcp/{i.Slug}", corpo.GetProperty("url").GetString());
        var tokens = corpo.GetProperty("tokens").EnumerateArray().ToList();
        Assert.Equal(["ativo", "revogado", "velho"], tokens.Select(t => t.GetProperty("nome").GetString()));
        Assert.Equal(["ATIVO", "REVOGADO", "EXPIRADO"], tokens.Select(t => t.GetProperty("estado").GetString()));
        Assert.All(tokens, t => Assert.Equal(["id", "nome", "usuario", "final", "criadoEm", "expiraEm", "ultimoUsoEm", "estado"], t.EnumerateObject().Select(p => p.Name)));
        Assert.Equal(admin.Nome, tokens[0].GetProperty("usuario").GetString());
        Assert.Equal(ativo[^4..], tokens[0].GetProperty("final").GetString());
        var texto = corpo.ToString();
        foreach (var segredo in new[] { ativo, revogado, expirado, Sha256(ativo) }) Assert.DoesNotContain(segredo, texto);
    }

    [Fact]
    public async Task Revogar_e_idempotente()
    {
        var (i, _, c) = await Admin();
        var id = (await (await c.PostAsJsonAsync(RotaTokens, new { nome = "x", dias = 30 })).Json()).GetProperty("id").GetInt64();
        var primeira = f.Relogio.GetUtcNow().UtcDateTime;

        Assert.Equal(HttpStatusCode.NoContent, (await c.DeleteAsync($"{RotaTokens}/{id}")).StatusCode);
        f.Relogio.Advance(TimeSpan.FromHours(1));
        Assert.Equal(HttpStatusCode.NoContent, (await c.DeleteAsync($"{RotaTokens}/{id}")).StatusCode);

        Assert.Equal(primeira, Assert.Single(await Gravados(i)).RevogadoEm);

        var outro = await f.Entrar(i, await f.Usuario(i, [Papeis.Administrador]));
        var alheio = (await (await c.PostAsJsonAsync(RotaTokens, new { nome = "y", dias = 30 })).Json()).GetProperty("id").GetInt64();
        Assert.Equal(HttpStatusCode.NoContent, (await outro.DeleteAsync($"{RotaTokens}/{alheio}")).StatusCode);
        Assert.NotNull((await Gravados(i)).Single(t => t.Id == alheio).RevogadoEm);
    }

    [Fact]
    public async Task Revogar_inexistente_ou_de_outra_instituicao_da_404()
    {
        var (_, _, c) = await Admin();
        var (j, outro, _) = await Admin();
        await f.NovoTokenMcp(j, outro);
        var idAlheio = Assert.Single(await Gravados(j)).Id;

        Assert.Equal(HttpStatusCode.NotFound, (await c.DeleteAsync($"{RotaTokens}/999999")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await c.DeleteAsync($"{RotaTokens}/{idAlheio}")).StatusCode);

        Assert.Null(Assert.Single(await Gravados(j)).RevogadoEm);
    }

    [Fact]
    public async Task Rotas_exigem_administrador()
    {
        var i = await f.Instituicao();
        var clientes = new List<(string papel, HttpClient cliente, HttpStatusCode esperado)>();
        foreach (var papel in new[] { Papeis.Atendente, Papeis.Aluno, Papeis.Operador })
            clientes.Add((papel, await f.Entrar(i, await f.Usuario(i, [papel])), HttpStatusCode.Forbidden));
        clientes.Add(("anônimo", f.Cliente(), HttpStatusCode.Unauthorized));

        foreach (var (papel, c, esperado) in clientes)
        {
            Assert.Equal(esperado, (await c.GetAsync(Rota)).StatusCode);
            Assert.Equal(esperado, (await c.PostAsJsonAsync(RotaTokens, new { nome = "x", dias = 30 })).StatusCode);
            Assert.Equal(esperado, (await c.DeleteAsync($"{RotaTokens}/1")).StatusCode);
        }
        Assert.Empty(await Gravados(i));
    }

    [Fact]
    public async Task Hash_e_unico_no_banco()
    {
        var i = await f.Instituicao();
        var j = await f.Instituicao();
        var (a, b) = (await f.Usuario(i, [Papeis.Administrador]), await f.Usuario(j, [Papeis.Administrador]));
        var hash = new string('c', 64);
        var agora = f.Relogio.GetUtcNow().UtcDateTime;
        await f.Db(i.Id, async db => { db.TokensMcp.Add(TokenMcp.Criar(a.Id, "a", hash, "1234", agora, 30)); await db.SaveChangesAsync(); });

        await Assert.ThrowsAsync<DbUpdateException>(() =>
            f.Db(j.Id, async db => { db.TokensMcp.Add(TokenMcp.Criar(b.Id, "b", hash, "1234", agora, 30)); await db.SaveChangesAsync(); }));
    }
}

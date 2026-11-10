using System.Net;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class McpAcessoTests(OneFactory f, OneFactoryMcpComLimite limitada) : IClassFixture<OneFactory>, IClassFixture<OneFactoryMcpComLimite>
{
    [Fact]
    public async Task Lista_as_quatro_ferramentas_sem_sessao()
    {
        var i = await f.Instituicao();
        var admin = await f.Usuario(i, [Papeis.Administrador, Papeis.Atendente]);
        var token = await f.NovoTokenMcp(i, admin);

        var (resposta, corpo) = await f.Rpc(i.Slug, $"Bearer {token}", "initialize", new { protocolVersion = "2025-06-18", capabilities = new { }, clientInfo = new { name = "teste", version = "1" } });
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.DoesNotContain("Mcp-Session-Id", resposta.Headers.Select(h => h.Key));

        var c = f.Cliente();
        c.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", $"Bearer {token}");
        foreach (var metodo in new[] { HttpMethod.Get, HttpMethod.Delete })
            Assert.Equal(HttpStatusCode.NotFound, (await c.SendAsync(new HttpRequestMessage(metodo, $"/api/mcp/{i.Slug}"))).StatusCode);
        var (_, listagem) = await f.Rpc(i.Slug, $"Bearer {token}", "tools/list");
        var ferramentas = listagem.GetProperty("result").GetProperty("tools").EnumerateArray().Select(t => t.GetProperty("name").GetString()).Order().ToList();
        Assert.Equal(["buscar_conhecimento", "listar_chamados", "ver_chamado", "ver_indicadores"], ferramentas);
    }

    [Theory]
    [InlineData("")]
    [InlineData("Bearer lixo")]
    [InlineData("Bearer onemcp_{slug}.")]
    [InlineData("Bearer onemcp_{slug}.ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq")]
    [InlineData("Basic dXNlcjpwYXNz")]
    public async Task Recusa_token_ausente_malformado_ou_desconhecido(string valor)
    {
        var i = await f.Instituicao();
        var r = await f.RpcStatus(i.Slug, valor.Length > 0 ? valor.Replace("{slug}", i.Slug) : null);
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
        Assert.Contains("Bearer", r.Headers.WwwAuthenticate.ToString());
    }

    [Fact]
    public async Task Recusa_token_revogado_e_vencido()
    {
        var i = await f.Instituicao();
        var admin = await f.Usuario(i, [Papeis.Administrador, Papeis.Atendente]);
        var agora = f.Relogio.GetUtcNow().UtcDateTime;
        var token = await f.NovoTokenMcp(i, admin);
        await f.Db(i.Id, db => db.TokensMcp.Where(t => t.Nome == "teste").ExecuteUpdateAsync(s => s.SetProperty(t => t.RevogadoEm, agora)));

        Assert.Equal(HttpStatusCode.Unauthorized, (await f.RpcStatus(i.Slug, $"Bearer {token}")).StatusCode);

        var vencido = await f.NovoTokenMcp(i, admin, dias: 1, nome: "curto", agora: agora.AddDays(-2));
        Assert.Equal(HttpStatusCode.Unauthorized, (await f.RpcStatus(i.Slug, $"Bearer {vencido}")).StatusCode);

        var quaseVencido = await f.NovoTokenMcp(i, admin, dias: 1, nome: "borda", agora: agora.AddDays(-1).AddSeconds(1));
        Assert.Equal(HttpStatusCode.OK, (await f.RpcStatus(i.Slug, $"Bearer {quaseVencido}")).StatusCode);
    }

    [Fact]
    public async Task Recusa_slug_diferente_do_token()
    {
        var (i, j) = (await f.Instituicao(), await f.Instituicao());
        var admin = await f.Usuario(i, [Papeis.Administrador, Papeis.Atendente]);
        var token = await f.NovoTokenMcp(i, admin);

        Assert.Equal(HttpStatusCode.Unauthorized, (await f.RpcStatus(j.Slug, $"Bearer {token}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await f.RpcStatus(i.Slug, $"Bearer {token}")).StatusCode);
    }

    [Fact]
    public async Task Recusa_quando_instituicao_ou_usuario_nao_valem_mais()
    {
        var i = await f.Instituicao();
        var admin = await f.Usuario(i, [Papeis.Administrador, Papeis.Atendente]);
        var soAluno = await f.Usuario(i, [Papeis.Aluno]);
        var trocar = await f.Usuario(i, [Papeis.Administrador], deveTrocarSenha: true);
        var inativo = await f.Usuario(i, [Papeis.Administrador, Papeis.Atendente]);
        await f.Db(i.Id, db => db.Usuarios.Where(u => u.Id == inativo.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.Ativo, false)));

        Assert.Equal(HttpStatusCode.Unauthorized, (await f.RpcStatus(i.Slug, $"Bearer {await f.NovoTokenMcp(i, soAluno)}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await f.RpcStatus(i.Slug, $"Bearer {await f.NovoTokenMcp(i, trocar)}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await f.RpcStatus(i.Slug, $"Bearer {await f.NovoTokenMcp(i, inativo)}")).StatusCode);

        await f.Db(null, db => db.Instituicoes.Where(x => x.Id == i.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativa, false)));
        Assert.Equal(HttpStatusCode.Unauthorized, (await f.RpcStatus(i.Slug, $"Bearer {await f.NovoTokenMcp(i, admin)}")).StatusCode);
    }

    [Fact]
    public async Task Grava_ultimo_uso_no_maximo_uma_vez_por_minuto()
    {
        var i = await f.Instituicao();
        var admin = await f.Usuario(i, [Papeis.Administrador, Papeis.Atendente]);
        var token = await f.NovoTokenMcp(i, admin);
        var agora = f.Relogio.GetUtcNow().UtcDateTime;

        Assert.Equal(HttpStatusCode.OK, (await f.RpcStatus(i.Slug, $"Bearer {token}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await f.RpcStatus(i.Slug, $"Bearer {token}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await f.RpcStatus(i.Slug, $"Bearer {token}")).StatusCode);

        var primeiro = Assert.Single(await f.Db(i.Id, db => db.TokensMcp.Select(t => t.UltimoUsoEm).ToListAsync()));
        Assert.Equal(agora, primeiro);

        f.Relogio.Advance(TimeSpan.FromSeconds(61));
        Assert.Equal(HttpStatusCode.OK, (await f.RpcStatus(i.Slug, $"Bearer {token}")).StatusCode);
        Assert.Equal(agora.AddSeconds(61), Assert.Single(await f.Db(i.Id, db => db.TokensMcp.Select(t => t.UltimoUsoEm).ToListAsync())));
    }

    [Fact]
    public async Task Cookie_e_token_nao_se_misturam()
    {
        var i = await f.Instituicao();
        var admin = await f.Usuario(i, [Papeis.Administrador, Papeis.Atendente]);
        var token = await f.NovoTokenMcp(i, admin);
        var logado = await f.Entrar(i, admin);

        Assert.Equal(HttpStatusCode.Unauthorized, (await f.RpcStatus(i.Slug, null, logado)).StatusCode);

        var c = f.Cliente();
        c.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", $"Bearer {token}");
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.GetAsync("/api/chamados")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.GetAsync("/api/admin/mcp")).StatusCode);
    }

    [Fact]
    public async Task Limita_requisicoes_por_token()
    {
        var i = await limitada.Instituicao();
        var admin = await limitada.Usuario(i, [Papeis.Administrador, Papeis.Atendente]);
        var t1 = await limitada.NovoTokenMcp(i, admin);
        var t2 = await limitada.NovoTokenMcp(i, admin, nome: "outro");

        for (var n = 0; n < 3; n++) Assert.Equal(HttpStatusCode.OK, (await limitada.RpcStatus(i.Slug, $"Bearer {t1}")).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await limitada.RpcStatus(i.Slug, $"Bearer {t1}")).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await limitada.RpcStatus(i.Slug, $"Bearer {t2}")).StatusCode);
    }
}
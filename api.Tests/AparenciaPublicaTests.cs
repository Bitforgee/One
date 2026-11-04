using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

// aparencia-instituicao S4: a aparência e as imagens, sem sessão (C30 a C32).
public class AparenciaPublicaTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<(Instituicao, HttpClient)> Admin(Instituicao? i = null)
    {
        i ??= await f.Instituicao(nome: "Univag");
        return (i, await f.Entrar(i, await f.Usuario(i, [Papeis.Administrador])));
    }

    [Fact]
    public async Task Instituicao_publica_traz_a_aparencia()
    {
        var (i, admin) = await Admin();
        await f.Db(null, db => db.Instituicoes.Where(x => x.Id == i.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.NomeCurto, "Univag").SetProperty(x => x.Cor, "#8a1538")
            .SetProperty(x => x.LoginItens, new[] { "Chamados" }).SetProperty(x => x.ContatoTelefone, "(65) 3688-6000")));
        await ImagemTeste.Enviar(admin, "logo", ImagemTeste.Png());

        var r = await f.Cliente().GetAsync($"/api/instituicoes/{i.Slug}");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var corpo = await r.Json();
        Assert.Equal("Univag", corpo.GetProperty("nome").GetString());
        Assert.Equal(["nome", "nomeCurto", "cor", "login", "assistente", "contato", "imagens"], corpo.EnumerateObject().Select(p => p.Name));
        Assert.Equal("#8a1538", corpo.GetProperty("cor").GetString());
        Assert.Equal(["Chamados"], corpo.GetProperty("login").GetProperty("itens").EnumerateArray().Select(e => e.GetString()));
        Assert.Equal("(65) 3688-6000", corpo.GetProperty("contato").GetProperty("telefone").GetString());
        var imagens = corpo.GetProperty("imagens");
        Assert.Equal(1, imagens.GetProperty("logo").GetInt32());
        Assert.All(["icone", "login", "assistente"], t => Assert.Equal(JsonValueKind.Null, imagens.GetProperty(t).ValueKind));

        await f.Db(null, db => db.Instituicoes.Where(x => x.Id == i.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativa, false)));
        Assert.Equal(HttpStatusCode.NotFound, (await f.Cliente().GetAsync($"/api/instituicoes/{i.Slug}")).StatusCode);
    }

    [Fact]
    public async Task Imagem_publica_com_cache_imutavel()
    {
        var (i, admin) = await Admin();
        var png = ImagemTeste.Png(tamanho: 300);
        await ImagemTeste.Enviar(admin, "logo", png);

        var r = await f.Cliente().GetAsync($"/api/instituicoes/{i.Slug}/imagens/logo?v=1");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal(png, await r.Content.ReadAsByteArrayAsync());
        Assert.Equal("image/png", r.Content.Headers.ContentType!.MediaType);
        Assert.Equal("public, max-age=31536000, immutable", Assert.Single(r.Headers.GetValues("Cache-Control")));
    }

    [Fact]
    public async Task Imagem_publica_404_e_503()
    {
        var (i, admin) = await Admin();
        var (inativa, adminInativa) = await Admin(await f.Instituicao());
        await ImagemTeste.Enviar(admin, "logo", ImagemTeste.Png());
        await ImagemTeste.Enviar(adminInativa, "logo", ImagemTeste.Png());
        await f.Db(null, db => db.Instituicoes.Where(x => x.Id == inativa.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativa, false)));
        var c = f.Cliente();

        Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync("/api/instituicoes/nao-existe/imagens/logo?v=1")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync($"/api/instituicoes/{inativa.Slug}/imagens/logo?v=1")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync($"/api/instituicoes/{i.Slug}/imagens/login?v=1")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync($"/api/instituicoes/{i.Slug}/imagens/fundo?v=1")).StatusCode);

        HttpResponseMessage r;
        using (f.MinioFora()) r = await c.GetAsync($"/api/instituicoes/{i.Slug}/imagens/logo?v=1");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, r.StatusCode);
    }
}

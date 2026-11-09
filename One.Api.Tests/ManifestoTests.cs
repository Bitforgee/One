using System.Net;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class ManifestoTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Manifesto_da_instituicao()
    {
        var i = await f.Instituicao(slug: "univag", nome: "Centro Universitário Vale");
        await f.Db(i.Id, async db =>
        {
            await db.Instituicoes.Where(x => x.Id == i.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.NomeCurto, "Univag").SetProperty(x => x.Cor, "#8a1538"));
            db.ImagensInstituicao.Add(new ImagemInstituicao { Tipo = "icone", Conteudo = "image/png", Tamanho = 1, Hash = new string('a', 64), Chave = "x/aparencia/y", Versao = 2 });
            await db.SaveChangesAsync();
        });

        var r = await f.Cliente().GetAsync("/api/instituicoes/univag/manifest.webmanifest");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal("application/manifest+json", r.Content.Headers.ContentType!.MediaType);
        var m = await r.Json();
        Assert.Equal(("Centro Universitário Vale", "Univag", "/univag/", "/univag/", "standalone", "#8a1538", "#ffffff"),
            (m.GetProperty("name").GetString(), m.GetProperty("short_name").GetString(), m.GetProperty("start_url").GetString(), m.GetProperty("scope").GetString(),
             m.GetProperty("display").GetString(), m.GetProperty("theme_color").GetString(), m.GetProperty("background_color").GetString()));
        var icones = m.GetProperty("icons").EnumerateArray().ToList();
        Assert.Equal(2, icones.Count);
        Assert.Equal(["192x192", "512x512"], icones.Select(x => x.GetProperty("sizes").GetString()));
        Assert.All(icones, x =>
        {
            Assert.Equal("/api/instituicoes/univag/imagens/icone?v=2", x.GetProperty("src").GetString());
            Assert.Equal("image/png", x.GetProperty("type").GetString());
        });
    }

    [Fact]
    public async Task Manifesto_padrao_sem_aparencia()
    {
        var i = await f.Instituicao(nome: "Centro Universitário Vale");

        var r = await f.Cliente().GetAsync($"/api/instituicoes/{i.Slug}/manifest.webmanifest");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var m = await r.Json();
        Assert.Equal("CV", m.GetProperty("short_name").GetString());
        Assert.Equal("#224fa7", m.GetProperty("theme_color").GetString());
        Assert.Equal($"/{i.Slug}/", m.GetProperty("start_url").GetString());
        var icones = m.GetProperty("icons").EnumerateArray().ToList();
        Assert.Equal(["/icons/icon-192.png", "/icons/icon-512.png"], icones.Select(x => x.GetProperty("src").GetString()));
        Assert.Equal(["192x192", "512x512"], icones.Select(x => x.GetProperty("sizes").GetString()));
    }

    [Fact]
    public async Task Manifesto_404()
    {
        var inativa = await f.Instituicao();
        await f.Db(null, db => db.Instituicoes.Where(x => x.Id == inativa.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativa, false)));
        var c = f.Cliente();

        Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync("/api/instituicoes/nao-existe/manifest.webmanifest")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync($"/api/instituicoes/{inativa.Slug}/manifest.webmanifest")).StatusCode);
    }
}

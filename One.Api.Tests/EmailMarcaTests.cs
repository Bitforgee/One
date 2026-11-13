using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class EmailMarcaTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string Corpo = "Olá, Ana & <script>alert(1)</script>.\n\nAbra o link: http://localhost:8080/x?a=1&b=2\n";
    static readonly HttpClient Mailpit = new() { BaseAddress = new Uri("http://localhost:8025") };

    async Task<(Instituicao, byte[])> InstituicaoComMarca(bool comLogo = true, string? cor = "#8a1538")
    {
        var i = await f.Instituicao(nome: "Univag & Cia");
        await f.Db(null, db => db.Instituicoes.Where(x => x.Id == i.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Cor, cor)));
        var logo = ImagemTeste.Png(tamanho: 200);
        if (comLogo) await ImagemTeste.Enviar(await f.Entrar(i, await f.Usuario(i, [Papeis.Administrador])), "logo", logo);
        return (i, logo);
    }

    async Task<string> Enfileirar(Instituicao i, string corpo = Corpo)
    {
        var para = $"{Guid.NewGuid():N}@aluno.com";
        await f.Db(i.Id, async db =>
        {
            db.EmailsSaida.Add(EmailSaida.Criar(para, "Aviso", corpo, f.Relogio.GetUtcNow().UtcDateTime));
            await db.SaveChangesAsync();
        });
        await f.Services.GetRequiredService<Agendador>().Executar();
        return para;
    }

    static string Texto(JsonElement msg) => msg.GetProperty("Text").GetString()!.Replace("\r\n", "\n");

    static async Task<string> Bruto(JsonElement msg) => await Mailpit.GetStringAsync($"/api/v1/message/{msg.GetProperty("ID").GetString()}/raw");

    [Fact]
    public async Task Email_vai_com_texto_e_html()
    {
        var (i, _) = await InstituicaoComMarca();
        var para = await Enfileirar(i);

        var msg = (await PrimeiroAcessoTests.EmailNoMailpit(para))!.Value;

        Assert.Contains("multipart/alternative", await Bruto(msg));
        Assert.Equal(Corpo, Texto(msg));
        Assert.Contains("<", msg.GetProperty("HTML").GetString());
        Assert.NotNull(await f.Db(i.Id, db => db.EmailsSaida.Where(e => e.Destinatario == para).Select(e => e.EnviadoEm).SingleAsync()));

        var u = await f.Usuario(i, [Papeis.Aluno], senha: null);
        await f.Cliente().PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = i.Slug, cpf = u.Cpf.Valor });
        var acesso = (await PrimeiroAcessoTests.EmailNoMailpit(u.Email))!.Value;
        Assert.Contains("background-color:#8a1538", acesso.GetProperty("HTML").GetString());
        Assert.Contains("Crie sua senha", acesso.GetProperty("Subject").GetString());
    }

    [Fact]
    public async Task Html_com_cor_logo_e_corpo_escapado()
    {
        var (i, logo) = await InstituicaoComMarca();
        var msg = (await PrimeiroAcessoTests.EmailNoMailpit(await Enfileirar(i)))!.Value;

        var html = msg.GetProperty("HTML").GetString()!;

        Assert.Contains("background-color:#8a1538", html);
        Assert.Contains("<img src=\"cid:logo\" alt=\"Univag &amp; Cia\"", html);
        Assert.Contains("Univag &amp; Cia", html);
        Assert.Contains("&lt;script&gt;", html);
        Assert.Contains("Ana &amp; ", html);
        Assert.DoesNotContain("<script>", html);
        Assert.Contains("<br>", html);
        var inline = Assert.Single(msg.GetProperty("Inline").EnumerateArray());
        Assert.Equal("logo", inline.GetProperty("ContentID").GetString());
        var bytes = await Mailpit.GetByteArrayAsync($"/api/v1/message/{msg.GetProperty("ID").GetString()}/part/{inline.GetProperty("PartID").GetString()}");
        Assert.Equal(logo, bytes);

        var (semMarca, _) = await InstituicaoComMarca(comLogo: false, cor: null);
        var simples = (await PrimeiroAcessoTests.EmailNoMailpit(await Enfileirar(semMarca)))!.Value.GetProperty("HTML").GetString()!;
        Assert.Contains("background-color:#224fa7", simples);
        Assert.DoesNotContain("cid:", simples);
    }

    [Fact]
    public async Task Minio_fora_envia_sem_logo()
    {
        var (i, _) = await InstituicaoComMarca();
        var para = $"{Guid.NewGuid():N}@aluno.com";
        await f.Db(i.Id, async db =>
        {
            db.EmailsSaida.Add(EmailSaida.Criar(para, "Aviso", Corpo, f.Relogio.GetUtcNow().UtcDateTime));
            await db.SaveChangesAsync();
        });

        using (f.MinioFora()) await f.Services.GetRequiredService<Agendador>().Executar();

        Assert.NotNull(await f.Db(i.Id, db => db.EmailsSaida.Where(e => e.Destinatario == para).Select(e => e.EnviadoEm).SingleAsync()));
        var msg = (await PrimeiroAcessoTests.EmailNoMailpit(para))!.Value;
        var html = msg.GetProperty("HTML").GetString()!;
        Assert.DoesNotContain("cid:", html);
        Assert.Contains("Univag &amp; Cia", html);
        Assert.Equal(Corpo, Texto(msg));
    }
}

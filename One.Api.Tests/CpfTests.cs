using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class CpfTests(OneFactory f) : IClassFixture<OneFactory>
{
    // C44: respostas fora de /api/admin/*.
    [Fact]
    public async Task Respostas_fora_do_admin_mascaram_cpf()
    {
        var i = await f.Instituicao();
        var u = await f.Usuario(i, [Papeis.Aluno], cpf: "12345678909");
        var c = f.Cliente();
        var corpos = new List<string>();
        async Task Guardar(Task<HttpResponseMessage> r) => corpos.Add(await (await r).Content.ReadAsStringAsync());

        await Guardar(c.Login(i.Slug, "123.456.789-09"));
        await Guardar(c.GetAsync("/api/auth/me"));
        await Guardar(c.GetAsync($"/api/instituicoes/{i.Slug}"));
        var criada = await c.PostAsJsonAsync("/api/conversas", new { mensagem = "preciso do boleto" });
        corpos.Add(await criada.Content.ReadAsStringAsync());
        var id = (await criada.Json()).GetProperty("conversaId").GetInt64();
        await Guardar(c.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "oi" }));
        await Guardar(c.GetAsync($"/api/conversas/{id}"));
        await Guardar(c.PostAsJsonAsync("/api/auth/primeiro-acesso", new { instituicao = i.Slug, cpf = u.Cpf }));
        var numero = (await (await c.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { })).Json()).GetProperty("numero").GetString();
        await Guardar(c.GetAsync("/api/chamados?escopo=meus"));
        await Guardar(c.GetAsync($"/api/chamados/{numero}"));
        var atendente = await f.Atendente(i, await f.Db(i.Id, db => db.Setores.SingleAsync()));
        await Guardar(atendente.Cliente.GetAsync("/api/chamados?escopo=fila"));
        await Guardar(atendente.Cliente.GetAsync($"/api/chamados/{numero}"));
        await Guardar(atendente.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null));
        await Guardar(atendente.Cliente.GetAsync("/api/indicadores?de=2026-11-01&ate=2026-11-30"));

        Assert.Contains(corpos, x => x.Contains("***.456.789-**"));
        Assert.All(corpos, x => Assert.DoesNotMatch(new Regex(@"(?<!\d)\d{11}(?!\d)"), x));
    }
}

using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Tests.Infra.SementeAtendimento;

namespace One.Api.Tests;

// base-fluxos S3 (C14 a C17 e C22, F7): não se desativa um setor que a versão vigente de um fluxo usa.
public class SetorEmFluxoTests(OneFactory f) : IClassFixture<OneFactory>
{
    record Mundo(Instituicao I, HttpClient Admin, Setor Financeiro, Curso Ads);

    async Task<Mundo> Montar()
    {
        var (i, admin) = await Admin.Criar(f);
        var ads = await f.Db(i.Id, async db => { var c = new Curso { Nome = "ADS" }; db.Cursos.Add(c); await db.SaveChangesAsync(); return c; });
        return new Mundo(i, admin, await f.Setor(i, "Financeiro"), ads);
    }

    static Task<HttpResponseMessage> Alterar(HttpClient admin, Setor s, bool ativo, string? nome = null) =>
        admin.PutAsJsonAsync($"/api/admin/setores/{s.Id}", new { nome = nome ?? s.Nome, triagem = false, ativo });

    Task<bool> Ativo(Instituicao i, long setorId) => f.Db(i.Id, db => db.Setores.Where(s => s.Id == setorId).Select(s => s.Ativo).SingleAsync());

    // C14
    [Fact]
    public async Task Setor_em_fluxo_publicado_nao_desativa()
    {
        var m = await Montar();
        await f.Fluxo(m.I, await f.Categoria(m.I, "Estágio"), null, null, Etapa(DestinosEtapa.Setor, m.Financeiro.Id));
        await f.Fluxo(m.I, await f.Categoria(m.I, "Boletos"), m.Ads.Id, null, Etapa(DestinosEtapa.CoordenacaoCurso), Etapa(DestinosEtapa.Setor, m.Financeiro.Id));

        var r = await Alterar(m.Admin, m.Financeiro, false);

        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal("O setor é usado em fluxo publicado (categoria: Boletos; Estágio). Publique o fluxo sem ele antes de desativar.", (await r.Json()).GetProperty("detail").GetString());
        Assert.True(await Ativo(m.I, m.Financeiro.Id));
    }

    // C15
    [Fact]
    public async Task Setor_so_em_rascunho_ou_versao_antiga_desativa()
    {
        var m = await Montar();
        var secretaria = await f.Setor(m.I, "Secretaria");
        await f.Fluxo(m.I, await f.Categoria(m.I, "Só rascunho"), null, null, false, Etapa(DestinosEtapa.Setor, m.Financeiro.Id));
        var antigo = await f.Fluxo(m.I, await f.Categoria(m.I, "Versão antiga"), null, null, Etapa(DestinosEtapa.Setor, secretaria.Id));
        await f.Db(m.I.Id, async db =>
        {
            var fluxo = await db.Fluxos.Include(x => x.Versoes).ThenInclude(v => v.Etapas).SingleAsync(x => x.Id == antigo.Id);
            fluxo.SalvarRascunho([Etapa(DestinosEtapa.CoordenacaoCurso)]);
            fluxo.Publicar(f.Relogio.GetUtcNow().UtcDateTime);
            await db.SaveChangesAsync();
        });

        Assert.Equal(HttpStatusCode.OK, (await Alterar(m.Admin, m.Financeiro, false)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Alterar(m.Admin, secretaria, false)).StatusCode);
        Assert.False(await Ativo(m.I, m.Financeiro.Id));
        Assert.False(await Ativo(m.I, secretaria.Id));
    }

    // C16
    [Fact]
    public async Task Renomear_e_reativar_seguem_como_hoje()
    {
        var m = await Montar();
        var secretaria = await f.Setor(m.I, "Secretaria");
        await f.Db(m.I.Id, db => db.Setores.Where(s => s.Id == secretaria.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativo, false)));
        await f.Fluxo(m.I, await f.Categoria(m.I, "Boletos"), null, null, Etapa(DestinosEtapa.Setor, m.Financeiro.Id));

        Assert.Equal(HttpStatusCode.OK, (await Alterar(m.Admin, m.Financeiro, true, nome: "Financeiro 2")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Alterar(m.Admin, secretaria, true)).StatusCode);

        var setor = await f.Db(m.I.Id, db => db.Setores.SingleAsync(s => s.Id == m.Financeiro.Id));
        Assert.Equal(("Financeiro 2", true), (setor.Nome, setor.Ativo));
        Assert.True(await Ativo(m.I, secretaria.Id));
    }

    // C17
    [Fact]
    public async Task Fluxo_de_outra_instituicao_nao_bloqueia()
    {
        var m = await Montar();
        var alheia = await Montar();
        await f.Fluxo(alheia.I, await f.Categoria(alheia.I, "Boletos"), null, null, Etapa(DestinosEtapa.Setor, alheia.Financeiro.Id));

        Assert.Equal(HttpStatusCode.OK, (await Alterar(m.Admin, m.Financeiro, false)).StatusCode);
        Assert.False(await Ativo(m.I, m.Financeiro.Id));
        Assert.True(await Ativo(alheia.I, alheia.Financeiro.Id));
    }

    // C22
    [Fact]
    public async Task Setor_inexistente_ou_alheio_404()
    {
        var m = await Montar();
        var alheia = await Montar();

        var inexistente = await m.Admin.PutAsJsonAsync("/api/admin/setores/999999", new { nome = "X", triagem = false, ativo = false });
        var deOutra = await Alterar(m.Admin, alheia.Financeiro, false);

        Assert.Equal((HttpStatusCode.NotFound, HttpStatusCode.NotFound), (inexistente.StatusCode, deOutra.StatusCode));
        Assert.True(await Ativo(alheia.I, alheia.Financeiro.Id));
    }
}

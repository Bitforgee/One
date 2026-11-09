using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

public class ReclassificarSaiDoFluxoTests(OneFactory f) : IClassFixture<OneFactory>
{
    static Task<HttpResponseMessage> Reclassificar(HttpClient c, string numero, object? categoriaId) =>
        c.PostAsJsonAsync($"/api/chamados/{numero}/reclassificar", new { categoriaId });

    [Fact]
    public async Task Reclassificar_no_fluxo_sai_da_etapa_e_fica_no_setor()
    {
        var c = await Cadeia.Criar(f, prazoPrimeira: 48);
        var nova = await f.Categoria(c.I, "Matrícula");
        var numero = await c.Transferir();
        var antes = await c.Ler(numero);
        Assert.Equal((1, c.Lideres.Id), (antes.EtapaOrdem, antes.SetorId));

        var r = await Reclassificar(c.A.Cliente, numero, nova.Id);

        Assert.True(r.IsSuccessStatusCode, $"{(int)r.StatusCode}");
        var depois = await c.Ler(numero);
        Assert.Equal((nova.Id, (int?)null, (DateTime?)null), (depois.CategoriaId, depois.EtapaOrdem, depois.EtapaDesde));
        Assert.Equal((antes.SetorId, antes.Estado, antes.VersaoFluxoId, antes.Encaminhamentos), (depois.SetorId, depois.Estado, depois.VersaoFluxoId, depois.Encaminhamentos));
        var eventos = (await c.Eventos(numero)).Where(e => e.Tipo == "RECLASSIFICACAO").ToList();
        var evento = Assert.Single(eventos);
        Assert.Equal(("Dúvida", "Matrícula"), (evento.De, evento.Para));
    }

    [Fact]
    public async Task Reclassificar_fora_de_fluxo_so_troca_a_categoria()
    {
        var c = await Cadeia.Criar(f);
        var triagem = await f.Db(c.I.Id, db => db.Setores.SingleAsync(s => s.Triagem));
        var atendente = await f.Atendente(c.I, triagem);
        var nova = await f.Categoria(c.I, "Matrícula");
        var numero = await c.Direto();
        var antes = await c.Ler(numero);
        Assert.Equal((null, null, null), (antes.VersaoFluxoId, antes.EtapaOrdem, antes.EtapaDesde));

        var r = await Reclassificar(atendente.Cliente, numero, nova.Id);

        Assert.True(r.IsSuccessStatusCode, $"{(int)r.StatusCode}");
        var depois = await c.Ler(numero);
        Assert.Equal((nova.Id, antes.SetorId, (long?)null, (int?)null, (DateTime?)null), (depois.CategoriaId, depois.SetorId, depois.VersaoFluxoId, depois.EtapaOrdem, depois.EtapaDesde));
        Assert.Single(await c.Eventos(numero), e => e.Tipo == "RECLASSIFICACAO");
    }

    [Fact]
    public async Task Reclassificado_nao_tem_subir_nem_fluxo()
    {
        var c = await Cadeia.Criar(f, prazoPrimeira: 48);
        var nova = await f.Categoria(c.I, "Matrícula");
        var numero = await c.Transferir();
        var antes = await c.Detalhe(c.A.Cliente, numero);
        Assert.Contains("subir", antes.GetProperty("acoes").EnumerateArray().Select(a => a.GetString()));
        Assert.Equal(System.Text.Json.JsonValueKind.Object, antes.GetProperty("fluxo").ValueKind);
        Assert.True((await Reclassificar(c.A.Cliente, numero, nova.Id)).IsSuccessStatusCode);

        var d = await c.Detalhe(c.A.Cliente, numero);

        Assert.Equal(System.Text.Json.JsonValueKind.Null, d.GetProperty("fluxo").ValueKind);
        Assert.DoesNotContain("subir", d.GetProperty("acoes").EnumerateArray().Select(a => a.GetString()));
        Assert.Equal(HttpStatusCode.Conflict, (await c.Subir(c.A.Cliente, numero)).StatusCode);
    }

    [Fact]
    public async Task Agendador_nao_sobe_o_reclassificado()
    {
        var c = await Cadeia.Criar(f, prazoPrimeira: 48);
        var nova = await f.Categoria(c.I, "Matrícula");
        var reclassificado = await c.Transferir();
        var intacto = await c.Transferir();
        foreach (var numero in new[] { reclassificado, intacto }) await c.EntrouNaEtapaHa(numero, TimeSpan.FromHours(49));
        Assert.True((await Reclassificar(c.A.Cliente, reclassificado, nova.Id)).IsSuccessStatusCode);

        await c.Agendador.Executar();

        var parado = await c.Ler(reclassificado);
        Assert.Equal((c.Lideres.Id, (int?)null), (parado.SetorId, parado.EtapaOrdem));
        var subiu = await c.Ler(intacto);
        Assert.Equal((c.Coordenacao.Id, 2), (subiu.SetorId, subiu.EtapaOrdem));
    }

    [Fact]
    public async Task Categoria_invalida_400_e_fluxo_intacto()
    {
        var c = await Cadeia.Criar(f, prazoPrimeira: 48);
        var inativa = await f.Categoria(c.I, "Antiga", ativa: false);
        var numero = await c.Transferir();
        var antes = await c.Ler(numero);

        foreach (var categoria in new long[] { inativa.Id, 999_999 })
        {
            var r = await Reclassificar(c.A.Cliente, numero, categoria);

            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
            Assert.True((await r.Json()).GetProperty("errors").TryGetProperty("categoriaId", out _));
        }
        var depois = await c.Ler(numero);
        Assert.Equal((antes.CategoriaId, antes.EtapaOrdem, antes.EtapaDesde, antes.VersaoFluxoId), (depois.CategoriaId, depois.EtapaOrdem, depois.EtapaDesde, depois.VersaoFluxoId));
    }
}

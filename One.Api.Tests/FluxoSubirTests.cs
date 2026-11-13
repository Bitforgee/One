using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.Chamados.EstadosChamado;
using static One.Api.Tests.Infra.SementeAtendimento;

namespace One.Api.Tests;

public class FluxoSubirTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Sobe_para_a_etapa_seguinte()
    {
        var c = await Cadeia.Criar(f);
        var numero = await c.Transferir();
        Assert.Equal(HttpStatusCode.OK, (await c.A.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null)).StatusCode);
        f.Relogio.Advance(TimeSpan.FromHours(1));

        var r = await c.Subir(c.A.Cliente, numero);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        Assert.Equal(("Coordenação", "ABERTO"), (j.GetProperty("setor").GetString(), j.GetProperty("estado").GetString()));
        var chamado = await c.Ler(numero);
        Assert.Equal((c.Coordenacao.Id, 2, f.Relogio.GetUtcNow().UtcDateTime, null, Aberto), (chamado.SetorId, chamado.EtapaOrdem, chamado.EtapaDesde, chamado.ResponsavelId, chamado.Estado));
    }

    [Fact]
    public async Task Subida_nao_e_encaminhamento()
    {
        var c = await Cadeia.Criar(f);
        var numero = await c.Transferir();
        await c.A.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null);

        await c.Subir(c.A.Cliente, numero, "Pede a coordenação");

        var chamado = await c.Ler(numero);
        Assert.Equal(0, chamado.Encaminhamentos);
        var subida = Assert.Single(await c.Eventos(numero), e => e.Tipo == "SUBIDA");
        Assert.Equal((c.A.Usuario.Id, "Líderes", "Coordenação", "Pede a coordenação"), (subida.AtorId, subida.De, subida.Para, subida.Detalhe));
        Assert.DoesNotContain(await c.Eventos(numero), e => e.Tipo == "ENCAMINHAMENTO");
        var nota = await f.Db(c.I.Id, db => db.MensagensChamado.SingleAsync(m => m.ChamadoId == chamado.Id));
        Assert.Equal(("NOTA", "Pede a coordenação"), (nota.Tipo, nota.Texto));
        Assert.Empty((await c.Detalhe(c.Aluno.Cliente, numero)).GetProperty("mensagens").EnumerateArray());
    }

    [Fact]
    public async Task Sem_proxima_etapa_409()
    {
        var c = await Cadeia.Criar(f);
        var triagem = await f.Db(c.I.Id, db => db.Setores.SingleAsync(s => s.Triagem));
        var daTriagem = await f.Atendente(c.I, triagem);
        var direto = await c.Direto();
        Assert.Equal(HttpStatusCode.Conflict, (await c.Subir(daTriagem.Cliente, direto)).StatusCode);

        var numero = await c.Transferir();
        Assert.Equal(HttpStatusCode.OK, (await c.Subir(c.A.Cliente, numero)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await c.Subir(c.B.Cliente, numero)).StatusCode);
        Assert.Equal(2, (await c.Ler(numero)).EtapaOrdem);

        var cursoSemCoordenacao = await Cadeia.Criar(f);
        var outraCategoria = await f.Categoria(cursoSemCoordenacao.I, "Só coordenação");
        await f.Fluxo(cursoSemCoordenacao.I, outraCategoria, null, null, Etapa(DestinosEtapa.Setor, cursoSemCoordenacao.Lideres.Id), Etapa(DestinosEtapa.CoordenacaoCurso));
        f.Llm.Devolver(new { tipo = "pergunta", texto = "Pode detalhar?", categoriaId = outraCategoria.Id });
        var conversa = (await (await cursoSemCoordenacao.Aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "ajuda" })).Json()).GetProperty("conversaId").GetInt64();
        var semSaida = (await (await cursoSemCoordenacao.Aluno.Cliente.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { })).Json()).GetProperty("numero").GetString()!;
        Assert.Equal(1, (await cursoSemCoordenacao.Ler(semSaida)).EtapaOrdem);
        Assert.Equal(HttpStatusCode.Conflict, (await cursoSemCoordenacao.Subir(cursoSemCoordenacao.A.Cliente, semSaida)).StatusCode);
        Assert.Equal(1, (await cursoSemCoordenacao.Ler(semSaida)).EtapaOrdem);
    }

    async Task<string> NoEstado(Cadeia c, string estado)
    {
        var numero = await c.Transferir();
        if (estado == Aberto) return numero;
        await c.A.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null);
        if (estado == AguardandoAluno) await Balcao.Mensagem(c.A.Cliente, numero, "Envie o comprovante.", aguardaAluno: true);
        if (estado is Resolvido or Fechado) await c.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/resolver", new { texto = "Feito." });
        if (estado == Fechado) await c.Aluno.Cliente.PostAsync($"/api/chamados/{numero}/confirmar", null);
        Assert.Equal(estado, (await c.Ler(numero)).Estado);
        return numero;
    }

    [Fact]
    public async Task Subir_por_estado()
    {
        var c = await Cadeia.Criar(f);

        foreach (var estado in new[] { Aberto, EmAtendimento, AguardandoAluno })
        {
            var numero = await NoEstado(c, estado);
            var r = await c.Subir(c.A.Cliente, numero);
            Assert.True(r.StatusCode == HttpStatusCode.OK, $"{estado}: {(int)r.StatusCode}");
            var chamado = await c.Ler(numero);
            Assert.Equal((c.Coordenacao.Id, 2, Aberto), (chamado.SetorId, chamado.EtapaOrdem, chamado.Estado));
        }
        foreach (var estado in new[] { Resolvido, Fechado })
        {
            var numero = await NoEstado(c, estado);
            var r = await c.Subir(c.A.Cliente, numero);
            Assert.True(r.StatusCode == HttpStatusCode.Conflict, $"{estado}: {(int)r.StatusCode}");
            Assert.Equal((c.Lideres.Id, 1), ((await c.Ler(numero)).SetorId, (await c.Ler(numero)).EtapaOrdem));
        }
    }

    [Fact]
    public async Task Motivo_obrigatorio_400()
    {
        var c = await Cadeia.Criar(f);
        var numero = await c.Transferir();

        foreach (var motivo in new object?[] { "", "   ", null })
        {
            var r = await c.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/subir", new { motivo });
            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
            Assert.True((await r.Json()).GetProperty("errors").TryGetProperty("motivo", out _));
        }
        var r2 = await c.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/subir", new { });
        Assert.Equal(HttpStatusCode.BadRequest, r2.StatusCode);
        Assert.Equal((c.Lideres.Id, 1), ((await c.Ler(numero)).SetorId, (await c.Ler(numero)).EtapaOrdem));
    }

    [Fact]
    public async Task Aluno_403_e_outro_setor_404()
    {
        var c = await Cadeia.Criar(f);
        var numero = await c.Transferir();

        Assert.Equal(HttpStatusCode.Forbidden, (await c.Subir(c.Aluno.Cliente, numero)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await c.Subir(c.C.Cliente, numero)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await c.Subir(c.B.Cliente, numero)).StatusCode);
        Assert.Equal((c.Lideres.Id, 1), ((await c.Ler(numero)).SetorId, (await c.Ler(numero)).EtapaOrdem));
    }

    static List<string> Acoes(JsonElement detalhe) => [.. detalhe.GetProperty("acoes").EnumerateArray().Select(a => a.GetString()!)];

    [Fact]
    public async Task Acao_subir_so_com_etapa_seguinte()
    {
        var c = await Cadeia.Criar(f);
        var numero = await c.Transferir();
        Assert.Contains("subir", Acoes(await c.Detalhe(c.A.Cliente, numero)));
        Assert.DoesNotContain("subir", Acoes(await c.Detalhe(c.Aluno.Cliente, numero)));

        await c.Subir(c.A.Cliente, numero);
        Assert.DoesNotContain("subir", Acoes(await c.Detalhe(c.B.Cliente, numero)));

        var triagem = await f.Db(c.I.Id, db => db.Setores.SingleAsync(s => s.Triagem));
        var daTriagem = await f.Atendente(c.I, triagem);
        Assert.DoesNotContain("subir", Acoes(await c.Detalhe(daTriagem.Cliente, await c.Direto())));

        var resolvido = await NoEstado(c, Resolvido);
        Assert.DoesNotContain("subir", Acoes(await c.Detalhe(c.A.Cliente, resolvido)));
    }

    [Fact]
    public async Task Encaminhar_manual_sai_do_fluxo()
    {
        var c = await Cadeia.Criar(f, prazoPrimeira: 48);
        var numero = await c.Transferir();

        var r = await c.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/encaminhar", new { setorId = c.Secretaria.Id, motivo = "É da secretaria." });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var chamado = await c.Ler(numero);
        Assert.Equal((null, null, c.Secretaria.Id, 1), (chamado.EtapaOrdem, chamado.EtapaDesde, chamado.SetorId, chamado.Encaminhamentos));
        var controle = await c.Transferir();
        await c.EntrouNaEtapaHa(controle, TimeSpan.FromHours(48));

        await c.Agendador.Executar();

        Assert.Equal(c.Secretaria.Id, (await c.Ler(numero)).SetorId);
        Assert.DoesNotContain(await c.Eventos(numero), e => e.Tipo == "SUBIDA");
        Assert.Equal((c.Coordenacao.Id, 2), ((await c.Ler(controle)).SetorId, (await c.Ler(controle)).EtapaOrdem));
    }
}

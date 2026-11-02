using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class SigiloTests(OneFactory f) : IClassFixture<OneFactory>
{
    // C62: o lote 2 acrescenta GET /api/chamados e GET /api/chamados/{numero} do aluno.
    [Fact]
    public async Task Aluno_nao_recebe_dado_de_artigo()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(Cenario.Resposta("Você encontra isso na área do aluno.", [c.Boleto.Id, c.Faltas.Id],
            (c.Boleto.Id, Cenario.TrechoBoleto), (c.Faltas.Id, Cenario.TrechoFaltas)));

        var primeira = await c.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "boleto e faltas" });
        var id = (await primeira.Json()).GetProperty("conversaId").GetInt64();
        var seguinte = await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "de novo" });
        var leitura = await c.Cliente.GetAsync($"/api/conversas/{id}");

        foreach (var r in new[] { primeira, seguinte, leitura })
        {
            Assert.True(r.IsSuccessStatusCode);
            var corpo = await r.Content.ReadAsStringAsync();
            Assert.Contains("resposta", corpo);
            foreach (var proibido in new[]
            {
                "Como emitir o boleto do semestre", "Faltas não são abonadas", Cenario.RespostaBoleto, Cenario.RespostaFaltas,
                Cenario.LinkBoleto, Cenario.LinkBiblioteca, Cenario.TrechoBoleto, Cenario.TrechoFaltas,
                "artigoId", "versaoArtigoId", "\"trechos\"", "\"fontes\"",
            })
                Assert.DoesNotContain(proibido, corpo, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task Aluno_pede_versao_de_artigo_404()
    {
        var c = await Cenario.Criar(f);
        var versao = await f.Db(c.Instituicao.Id, db => db.VersoesArtigo.Where(v => v.ArtigoId == c.Boleto.Id).Select(v => v.Id).SingleAsync());

        var r = await c.Cliente.GetAsync($"/api/artigos/versoes/{versao}");

        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
        Assert.DoesNotContain(Cenario.RespostaBoleto, await r.Content.ReadAsStringAsync());
    }
}

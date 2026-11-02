using System.Net;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class VersaoCitadaTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Edicao_nao_muda_o_exibido_e_avisa_a_equipe()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(c.RespostaBoletoValida("Você encontra o boleto no Portal do Aluno."));
        var (id, _) = await c.Primeira();
        var v1 = await f.Db(c.Instituicao.Id, db => db.VersoesArtigo.SingleAsync(v => v.ArtigoId == c.Boleto.Id));
        var citada = await f.Db(c.Instituicao.Id, db => db.Citacoes.Select(x => x.VersaoArtigoId).SingleAsync());
        Assert.Equal(v1.Id, citada);

        // edição do artigo: nova versão (a rota de edição chega com o S7)
        var v2 = await f.Db(c.Instituicao.Id, async db =>
        {
            var v = new VersaoArtigo { ArtigoId = c.Boleto.Id, Numero = 2, Titulo = "Boleto (novo)", Perguntas = ["boleto?"], Resposta = "Texto novo do boleto.", Links = [], CriadaEm = DateTime.UtcNow };
            db.VersoesArtigo.Add(v);
            await db.SaveChangesAsync();
            return v;
        });

        var conversa = await (await c.Cliente.GetAsync($"/api/conversas/{id}")).Json();
        Assert.Equal("Você encontra o boleto no Portal do Aluno.", conversa.GetProperty("mensagens")[1].GetProperty("texto").GetString());

        var atendente = await f.Entrar(c.Instituicao, await f.Usuario(c.Instituicao, [Papeis.Atendente]));
        var r = await atendente.GetAsync($"/api/artigos/versoes/{v1.Id}");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        Assert.Equal("Como emitir o boleto do semestre", j.GetProperty("titulo").GetString());
        Assert.Equal(Cenario.RespostaBoleto, j.GetProperty("texto").GetString());
        Assert.Equal([Cenario.LinkBoleto, Cenario.LinkBiblioteca], j.GetProperty("links").EnumerateArray().Select(l => l.GetString()));
        Assert.Equal(v2.Id, j.GetProperty("versaoAtivaAtualId").GetInt64());

        var atual = await (await atendente.GetAsync($"/api/artigos/versoes/{v2.Id}")).Json();
        Assert.Equal(System.Text.Json.JsonValueKind.Null, atual.GetProperty("versaoAtivaAtualId").ValueKind);
    }
}

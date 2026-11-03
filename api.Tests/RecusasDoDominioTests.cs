using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

// dominio-e-contratos C24, C25 e C31: as recusas de negócio que a entidade passa a decidir, presas na fronteira HTTP com o código
// da base (status, detail e nada gravado).
public class RecusasDoDominioTests(OneFactory f) : IClassFixture<OneFactory>
{
    static async Task<string?> Detail(HttpResponseMessage r) => (await r.Json()).GetProperty("detail").GetString();

    Task<(string, long?, int, int)> Retrato(Balcao b, string numero) =>
        f.Db(b.Instituicao.Id, async db =>
        {
            var c = await db.Chamados.SingleAsync(x => x.Numero == numero);
            return (c.Estado, c.ResponsavelId, await db.EventosChamado.CountAsync(e => e.ChamadoId == c.Id), await db.MensagensChamado.CountAsync(m => m.ChamadoId == c.Id));
        });

    // C24
    [Fact]
    public async Task Assumir_sendo_o_responsavel_409()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);
        var antes = await Retrato(b, numero);
        Assert.Equal(b.A.Usuario.Id, antes.Item2);

        var r = await b.A.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null);

        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal("Você já é o responsável por este chamado.", await Detail(r));
        Assert.Equal(antes, await Retrato(b, numero));
    }

    // C25
    [Fact]
    public async Task Rejeitar_ou_responder_fora_do_prazo_409()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Resolvido);
        await b.Recuar(numero, TimeSpan.FromDays(7) + TimeSpan.FromMinutes(1));
        var antes = await Retrato(b, numero);

        foreach (var (nome, r) in new[]
        {
            ("rejeitar", await b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{numero}/rejeitar", new { motivo = "Continua sem boleto." })),
            ("responder", await Balcao.Mensagem(b.ClienteAluno, numero, "Ainda preciso do boleto.")),
        })
        {
            Assert.True(r.StatusCode == HttpStatusCode.Conflict, $"{nome}: {(int)r.StatusCode}");
            Assert.Equal("O prazo de 7 dias para rejeitar a resolução terminou.", await Detail(r));
        }
        Assert.Equal(antes, await Retrato(b, numero));
        Assert.Equal(Resolvido, antes.Item1);
    }

    // C31
    [Fact]
    public async Task Artigo_ja_ativo_ou_ja_arquivado_409()
    {
        var (i, admin) = await Admin.Criar(f);
        var categoria = await f.Db(i.Id, db => db.Categorias.SingleAsync(c => c.Padrao));
        var criado = await admin.PostAsJsonAsync("/api/admin/artigos", new { titulo = "Boleto", perguntas = new[] { "Onde está o boleto?" }, categoriaId = categoria.Id, resposta = "No portal." });
        Assert.Equal(HttpStatusCode.Created, criado.StatusCode);
        var id = (await criado.Json()).GetProperty("id").GetInt64();
        async Task<string> Lista() => await (await admin.GetAsync("/api/admin/artigos")).Content.ReadAsStringAsync();

        foreach (var (acao, detail) in new[] { ("ativar", "O artigo já está ativo."), ("arquivar", "O artigo já está arquivado.") })
        {
            Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/api/admin/artigos/{id}/{acao}", null)).StatusCode);
            var antes = await Lista();

            var r = await admin.PostAsync($"/api/admin/artigos/{id}/{acao}", null);

            Assert.True(r.StatusCode == HttpStatusCode.Conflict, $"{acao}: {(int)r.StatusCode}");
            Assert.Equal(detail, await Detail(r));
            Assert.Equal(antes, await Lista());
        }
    }
}

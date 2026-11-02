using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class ConversaTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<(Cenario c, long id)> Aberta()
    {
        var c = await Cenario.Criar(f);
        f.Llm.Devolver(c.RespostaBoletoValida());
        var (id, _) = await c.Primeira();
        return (c, id);
    }

    Task<Conversa> Ler(Cenario c, long id) => f.Db(c.Instituicao.Id, db => db.Conversas.Include(x => x.Mensagens).SingleAsync(x => x.Id == id));

    [Fact]
    public async Task Sim_resolve_sem_chamado()
    {
        var (c, id) = await Aberta();

        var r = await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/avaliacao", new { resolveu = true });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal("RESOLVIDA_AUTOATENDIMENTO", (await r.Json()).GetProperty("desfecho").GetString());
        Assert.Equal("RESOLVIDA_AUTOATENDIMENTO", (await Ler(c, id)).Desfecho);
        Assert.Equal(0, await f.Db(c.Instituicao.Id, db => db.Chamados.CountAsync()));
    }

    [Fact]
    public async Task Nao_mantem_aberta()
    {
        var (c, id) = await Aberta();

        var r = await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/avaliacao", new { resolveu = false });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Null((await Ler(c, id)).Desfecho);
        Assert.Equal(HttpStatusCode.OK, (await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "explico melhor" })).StatusCode);
    }

    [Fact]
    public async Task Encerrar_200()
    {
        var (c, id) = await Aberta();

        var r = await c.Cliente.PostAsync($"/api/conversas/{id}/encerrar", null);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal("ENCERRADA_PELO_ALUNO", (await r.Json()).GetProperty("desfecho").GetString());
        Assert.Equal("ENCERRADA_PELO_ALUNO", (await Ler(c, id)).Desfecho);
    }

    [Fact]
    public async Task Decima_primeira_mensagem_409()
    {
        var (c, id) = await Aberta();
        for (var n = 2; n <= 10; n++)
            Assert.Equal(HttpStatusCode.OK, (await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = $"mensagem {n}" })).StatusCode);

        var r = await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "mensagem 11" });

        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal(10, (await Ler(c, id)).Mensagens.Count(m => m.Autor == "ALUNO"));
    }

    // C75: o lote 2 acrescenta a transferência a esta lista.
    [Fact]
    public async Task Conversa_com_desfecho_409()
    {
        var (c, id) = await Aberta();
        await c.Cliente.PostAsync($"/api/conversas/{id}/encerrar", null);
        var antes = await Ler(c, id);

        var respostas = new[]
        {
            await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "oi" }),
            await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/avaliacao", new { resolveu = true }),
            await c.Cliente.PostAsync($"/api/conversas/{id}/encerrar", null),
        };

        Assert.All(respostas, r => Assert.Equal(HttpStatusCode.Conflict, r.StatusCode));
        var depois = await Ler(c, id);
        Assert.Equal(antes.Desfecho, depois.Desfecho);
        Assert.Equal(antes.DesfechoEm, depois.DesfechoEm);
        Assert.Equal(antes.Mensagens.Count, depois.Mensagens.Count);
    }

    // C76: o lote 2 acrescenta a transferência a esta lista (5 rotas).
    [Fact]
    public async Task Conversa_de_outro_aluno_404()
    {
        var (c, id) = await Aberta();
        var outro = await f.AlunoLogado(c.Instituicao);

        var respostas = new[]
        {
            await outro.Cliente.GetAsync($"/api/conversas/{id}"),
            await outro.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "oi" }),
            await outro.Cliente.PostAsJsonAsync($"/api/conversas/{id}/avaliacao", new { resolveu = true }),
            await outro.Cliente.PostAsync($"/api/conversas/{id}/encerrar", null),
        };

        Assert.All(respostas, r => Assert.Equal(HttpStatusCode.NotFound, r.StatusCode));
        var conversa = await Ler(c, id);
        Assert.Null(conversa.Desfecho);
        Assert.Equal(2, conversa.Mensagens.Count);
    }

    [Fact]
    public async Task Get_conversa_200_com_mensagens_e_chamado()
    {
        var (c, id) = await Aberta();
        f.Llm.Devolver(new { tipo = "sem_base", texto = "" });
        await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "e a segunda via?" });

        var r = await c.Cliente.GetAsync($"/api/conversas/{id}");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        Assert.Equal(id, j.GetProperty("conversa").GetProperty("id").GetInt64());
        var mensagens = j.GetProperty("mensagens").EnumerateArray().ToList();
        Assert.Equal(["preciso do boleto", "Você encontra o boleto no Portal do Aluno, na área financeira.", "e a segunda via?",
            "Não encontrei isso nas orientações da instituição. Posso transferir você para um atendente."],
            mensagens.Select(m => m.GetProperty("texto").GetString()));
        Assert.Equal(["ALUNO", "ASSISTENTE", "ALUNO", "ASSISTENTE"], mensagens.Select(m => m.GetProperty("autor").GetString()));
        Assert.Equal(JsonValueKindNull, j.GetProperty("desfecho").ValueKind);
        Assert.Equal(JsonValueKindNull, j.GetProperty("chamadoNumero").ValueKind);

        // a transferência (lote 2) grava o chamado da conversa; aqui ele é gravado direto
        await f.Db(c.Instituicao.Id, async db =>
        {
            db.Chamados.Add(new Chamado { Numero = "ONE-1", ConversaId = id });
            await db.Conversas.Where(x => x.Id == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Desfecho, "TRANSFERIDA"));
            await db.SaveChangesAsync();
        });
        var depois = await (await c.Cliente.GetAsync($"/api/conversas/{id}")).Json();
        Assert.Equal("ONE-1", depois.GetProperty("chamadoNumero").GetString());
        Assert.Equal("TRANSFERIDA", depois.GetProperty("desfecho").GetString());
    }

    const System.Text.Json.JsonValueKind JsonValueKindNull = System.Text.Json.JsonValueKind.Null;

    [Fact]
    public async Task Avaliacao_sem_resolveu_400()
    {
        var (c, id) = await Aberta();

        var r = await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/avaliacao", new { });

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Null((await Ler(c, id)).Desfecho);
    }
}

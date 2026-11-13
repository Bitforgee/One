using Microsoft.EntityFrameworkCore;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using One.Api.Dados;
using One.Api.Dados.Trechos;
using One.Api.Tests.Infra;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Tests;

public class AgendadorLogsTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string CategoriaDaBase = "One.Api.Agendador";

    Agendador Agendador => f.Services.GetRequiredService<Agendador>();

    List<Log> Do(string modelo) => [.. f.Logs.Entradas.Where(l => Equals(l.Campos.GetValueOrDefault("{OriginalFormat}"), modelo))];

    [Fact]
    public async Task Abandono_de_conversa_loga_na_categoria_do_agendador()
    {
        var aluno = await f.AlunoLogado();
        var id = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).Json()).GetProperty("conversaId").GetInt64();
        f.Relogio.Advance(TimeSpan.FromMinutes(30));

        await Agendador.Executar();

        var log = Assert.Single(Do("Conversa {ConversaId} abandonada (instituição {InstituicaoId})"), l => Equals(l.Campos["ConversaId"], id));
        Assert.Equal((CategoriaDaBase, LogLevel.Information), (log.Categoria, log.Nivel));
    }

    [Fact]
    public async Task Fechamento_automatico_loga_na_categoria_do_agendador()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Resolvido);
        await b.Recuar(numero, TimeSpan.FromDays(7));
        var chamadoId = (await b.Ler(numero)).Id;

        await Agendador.Executar();

        var log = Assert.Single(Do("Chamado {ChamadoId} fechado automaticamente (instituição {InstituicaoId})"), l => Equals(l.Campos["ChamadoId"], chamadoId));
        Assert.Equal((CategoriaDaBase, LogLevel.Information), (log.Categoria, log.Nivel));
    }

    [Fact]
    public async Task Indexacao_de_trechos_loga_na_categoria_do_agendador()
    {
        var i = await f.Instituicao();
        var artigo = await f.Artigo(i, "Rascunho", "x", estado: EstadosArtigo.Rascunho);
        await f.Db(i.Id, async db =>
        {
            var versao = await db.VersoesArtigo.Where(v => v.ArtigoId == artigo.Id).Select(v => v.Id).SingleAsync();
            db.TrechosFonte.Add(TrechoFonte.DaVersaoDeArtigo(versao, 0, "trecho unico", f.Relogio.GetUtcNow().UtcDateTime.AddDays(-1)));
            await db.SaveChangesAsync();
        });

        await Agendador.Executar();

        Assert.Contains(Do("Agendador indexou {Quantidade} trechos de fonte"), l => (l.Categoria, l.Nivel) == (CategoriaDaBase, LogLevel.Information));
    }

    [Fact]
    public async Task Falha_de_embeddings_loga_na_categoria_do_agendador()
    {
        var i = await f.Instituicao();
        var artigo = await f.Artigo(i, "Rascunho", "x", estado: EstadosArtigo.Rascunho);
        await f.Db(i.Id, async db =>
        {
            var versao = await db.VersoesArtigo.Where(v => v.ArtigoId == artigo.Id).Select(v => v.Id).SingleAsync();
            db.TrechosFonte.Add(TrechoFonte.DaVersaoDeArtigo(versao, 0, "trecho com falha", f.Relogio.GetUtcNow().UtcDateTime.AddDays(-1)));
            await db.SaveChangesAsync();
        });
        f.Llm.ResponderEmbeddings = (_, _) => Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.InternalServerError));
        try { await Agendador.Executar(); }
        finally { f.Llm.ResponderEmbeddings = null; }

        var log = Assert.Single(Do("Falha ao gerar embeddings de {Quantidade} trechos da instituição {InstituicaoId}, tentativa {Tentativas}"), l => Equals(l.Campos["InstituicaoId"], i.Id));
        Assert.Equal((CategoriaDaBase, LogLevel.Warning), (log.Categoria, log.Nivel));
    }
}

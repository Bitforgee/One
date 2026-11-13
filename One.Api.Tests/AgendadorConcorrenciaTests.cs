using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

public class AgendadorConcorrenciaTests(OneFactory f) : IClassFixture<OneFactory>
{
    Agendador Agendador => f.Services.GetRequiredService<Agendador>();
    DateTime Agora => f.Relogio.GetUtcNow().UtcDateTime;

    record Contagem(int Eventos, int Mensagens, int Avisos);

    static async Task<long> NovaConversa(Aluno a) =>
        (await (await a.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).Json()).GetProperty("conversaId").GetInt64();

    Task<string?> Desfecho(Instituicao i, long id) => f.Db(i.Id, db => db.Conversas.Where(c => c.Id == id).Select(c => c.Desfecho).SingleAsync());

    int Abandonos(long id) => f.Logs.Entradas.Count(l => l.Mensagem.Contains($"Conversa {id} abandonada"));

    Task<Contagem> Contar(Balcao b, string numero) => f.Db(b.Instituicao.Id, async db =>
    {
        var id = await db.Chamados.Where(c => c.Numero == numero).Select(c => c.Id).SingleAsync();
        return new Contagem(await db.EventosChamado.CountAsync(e => e.ChamadoId == id), await db.MensagensChamado.CountAsync(m => m.ChamadoId == id),
            await db.EmailsSaida.CountAsync() + await db.PushesSaida.CountAsync());
    });

    Task Aguardando(Balcao b, string numero, TimeSpan ha) =>
        f.Db(b.Instituicao.Id, db => db.Chamados.Where(c => c.Numero == numero).ExecuteUpdateAsync(s => s.SetProperty(c => c.AguardandoDesde, Agora - ha)));

    static List<Agendador.Item> Do(List<Agendador.Item> lidos, string tipo, long id) => lidos.Where(x => x.Tipo == tipo && x.Id == id).ToList();

    [Fact]
    public async Task Conversa_mudada_entre_Ler_e_Processar_fica_intacta()
    {
        var aluno = await f.AlunoLogado();
        var id = await NovaConversa(aluno);
        f.Relogio.Advance(TimeSpan.FromMinutes(30));
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "conversa", id));
        Assert.Equal(HttpStatusCode.OK, (await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "ainda estou aqui" })).StatusCode);

        await Agendador.Processar(Do(lidos, "conversa", id));

        Assert.Null(await Desfecho(aluno.Instituicao, id));
        Assert.Equal(0, Abandonos(id));
    }

    [Fact]
    public async Task Resolvido_mudado_entre_Ler_e_Processar_fica_intacto()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Resolvido);
        await b.Recuar(numero, TimeSpan.FromDays(7));
        var chamadoId = (await b.Ler(numero)).Id;
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "chamado", chamadoId));
        await f.Db(b.Instituicao.Id, db => db.Chamados.Where(c => c.Numero == numero).ExecuteUpdateAsync(s => s.SetProperty(c => c.Estado, EmAtendimento)));
        var antes = await Contar(b, numero);

        await Agendador.Processar(Do(lidos, "chamado", chamadoId));

        var c = await b.Ler(numero);
        Assert.Equal((EmAtendimento, (string?)null), (c.Estado, c.MotivoFechamento));
        Assert.Equal(antes, await Contar(b, numero));
        Assert.Equal(0, (await b.Eventos(numero)).Count(e => e.Para == Fechado));
    }

    [Fact]
    public async Task Lembrete_mudado_entre_Ler_e_Processar_fica_intacto()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(AguardandoAluno);
        await Aguardando(b, numero, TimeSpan.FromDays(4));
        var chamadoId = (await b.Ler(numero)).Id;
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "lembrete", chamadoId));
        Assert.Equal(HttpStatusCode.Created, (await Balcao.Mensagem(b.ClienteAluno, numero, "Segue o comprovante.")).StatusCode);
        var antes = await Contar(b, numero);

        await Agendador.Processar(Do(lidos, "lembrete", chamadoId));

        Assert.Null((await b.Ler(numero)).LembreteEm);
        Assert.Equal(antes, await Contar(b, numero));
        Assert.DoesNotContain(await b.Eventos(numero), e => e.Tipo == TiposEvento.Lembrete);
    }

    [Fact]
    public async Task SemResposta_mudado_entre_Ler_e_Processar_fica_intacto()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(AguardandoAluno);
        await Aguardando(b, numero, TimeSpan.FromDays(10));
        var chamadoId = (await b.Ler(numero)).Id;
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "aguardando", chamadoId));
        await Aguardando(b, numero, TimeSpan.Zero);
        var antes = await Contar(b, numero);

        await Agendador.Processar(Do(lidos, "aguardando", chamadoId));

        Assert.Equal(AguardandoAluno, (await b.Ler(numero)).Estado);
        Assert.Equal(antes, await Contar(b, numero));
        Assert.DoesNotContain(await f.Db(b.Instituicao.Id, db => db.MensagensChamado.Where(m => m.ChamadoId == chamadoId).Select(m => m.Texto).ToListAsync()), t => t == Agendador.TextoSemResposta);
    }

    [Fact]
    public async Task Duas_execucoes_conversa_um_abandono()
    {
        var aluno = await f.AlunoLogado();
        var id = await NovaConversa(aluno);
        f.Relogio.Advance(TimeSpan.FromMinutes(30));

        await Task.WhenAll(Agendador.Executar(), Agendador.Executar());

        Assert.Equal("ABANDONADA", await Desfecho(aluno.Instituicao, id));
        Assert.Equal(1, Abandonos(id));
    }

    [Fact]
    public async Task Duas_execucoes_resolvido_um_fechamento()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Resolvido);
        await b.Recuar(numero, TimeSpan.FromDays(7));

        await Task.WhenAll(Agendador.Executar(), Agendador.Executar());

        Assert.Equal(1, (await b.Eventos(numero)).Count(e => e.Tipo == TiposEvento.Transicao && e.De == Resolvido && e.Para == Fechado));
        Assert.Equal(Fechado, (await b.Ler(numero)).Estado);
    }

    [Fact]
    public async Task Duas_execucoes_lembrete_um_lembrete()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(AguardandoAluno);
        await Aguardando(b, numero, TimeSpan.FromDays(4));

        await Task.WhenAll(Agendador.Executar(), Agendador.Executar());

        Assert.Equal(1, (await b.Eventos(numero)).Count(e => e.Tipo == TiposEvento.Lembrete));
        Assert.Equal(1, await f.Db(b.Instituicao.Id, db => db.EmailsSaida.CountAsync(e => e.Assunto == $"[{b.Instituicao.Nome}] {numero} aguarda sua resposta")));
    }

    [Fact]
    public async Task Duas_execucoes_sem_resposta_uma_resolucao()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(AguardandoAluno);
        await Aguardando(b, numero, TimeSpan.FromDays(10));
        var chamadoId = (await b.Ler(numero)).Id;

        await Task.WhenAll(Agendador.Executar(), Agendador.Executar());

        Assert.Equal(1, await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync(m => m.ChamadoId == chamadoId && m.Texto == Agendador.TextoSemResposta)));
        Assert.Equal(1, (await b.Eventos(numero)).Count(e => e.Tipo == TiposEvento.Transicao && e.De == AguardandoAluno && e.Para == Resolvido));
        Assert.Equal(Resolvido, (await b.Ler(numero)).Estado);
    }

    [Fact]
    public async Task Trecho_indexado_entre_Ler_e_Processar_fica_intacto()
    {
        var i = await f.Instituicao();
        var id = await f.SemEmbedding(i);
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "trecho", id));
        var concorrente = new Pgvector.Vector(LlmFalso.Vetor("escrita concorrente"));
        await f.Db(i.Id, db => db.TrechosFonte.Where(t => t.Id == id).ExecuteUpdateAsync(s => s.SetProperty(t => t.Embedding, concorrente)));

        await Agendador.Processar(Do(lidos, "trecho", id));

        var trecho = await f.Db(i.Id, db => db.TrechosFonte.SingleAsync(t => t.Id == id));
        Assert.Equal(concorrente.ToArray(), trecho.Embedding!.ToArray());
        Assert.Equal(0, trecho.Tentativas);
    }
}

using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using One.Api.Assistente;
using One.Api.Chamados;
using One.Api.Instituicoes;
using Lib.Net.Http.WebPush;
using One.Api.Dados;
using One.Api.Dados.Fluxos;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api;

public sealed record ItemAgendado(string Tipo, long Id, long InstituicaoId);

public interface ITarefaAgendada
{
    string Tipo { get; }

    int Lote => 1;

    Task<List<ItemAgendado>> Ler(OneDb db, DateTime agora);

    Task Executar(OneDb db, IReadOnlyList<ItemAgendado> itens, DateTime agora, CancellationToken parar);

    Task Limpar(OneDb db, DateTime agora, CancellationToken parar) => Task.CompletedTask;
}
public class Agendador(IServiceScopeFactory escopos, TimeProvider relogio, IConfiguration cfg, Prazos prazos, IEnumerable<ITarefaAgendada> tarefas, ILogger<Agendador> log) : BackgroundService
{
    public const string TextoSemResposta = Chamado.TextoSemResposta;
    public const int MaxTentativas = 5;

    protected override async Task ExecuteAsync(CancellationToken parar)
    {
        if (!cfg.GetValue("Agendador:Ativo", true)) return;
        while (!parar.IsCancellationRequested)
        {
            try { await Executar(parar); }
            catch (Exception e) when (e is not OperationCanceledException) { log.LogError(e, "Falha na execução do agendador"); }
            await Task.Delay(TimeSpan.FromSeconds(60), relogio, parar);
        }
    }

    public async Task Executar(CancellationToken parar = default)
    {
        await Processar(await Ler(), parar);
        await ApagarLancamentosVencidos(parar);
    }

    async Task ApagarLancamentosVencidos(CancellationToken parar)
    {
        using var escopo = escopos.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<OneDb>();
        var limite = relogio.GetUtcNow().UtcDateTime - TimeSpan.FromDays(1);
        await db.LtiLancamentos.IgnoreQueryFilters().Where(l => l.ExpiraEm < limite).ExecuteDeleteAsync(parar);
    }

    public async Task<List<ItemAgendado>> Ler()
    {
        using var escopo = escopos.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<OneDb>();
        var agora = relogio.GetUtcNow().UtcDateTime;
        var itens = await LerAtendimento(db, agora);
        foreach (var tarefa in tarefas) itens.AddRange(await tarefa.Ler(db, agora));
        return itens;
    }

    async Task<List<ItemAgendado>> LerAtendimento(OneDb db, DateTime agora)
    {
        var limiteConversa = agora - prazos.Abandono;
        var itens = await db.Conversas.IgnoreQueryFilters().Where(c => c.Desfecho == null && c.UltimaMensagemEm <= limiteConversa)
            .Select(c => new ItemAgendado("conversa", c.Id, c.InstituicaoId)).ToListAsync();
        return itens;
    }

    public async Task Processar(List<ItemAgendado> itens, CancellationToken parar = default)
    {
        foreach (var tarefa in tarefas.Where(t => t.Lote > 1)) await ExecutarEmLotes(tarefa, itens, parar);
        foreach (var item in itens.Where(i => !Migrado(i)))
        {
            parar.ThrowIfCancellationRequested();
            try
            {
                using var escopo = escopos.CreateScope();
                var db = escopo.ServiceProvider.GetRequiredService<OneDb>();
                db.InstituicaoAtual = item.InstituicaoId;
                await Despachar(db, escopo.ServiceProvider, item, relogio.GetUtcNow().UtcDateTime, parar);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogError(e, "Agendador falhou no item {Tipo} {ItemId} da instituição {InstituicaoId}", item.Tipo, item.Id, item.InstituicaoId);
            }
        }
        foreach (var tarefa in tarefas.Where(t => t.Lote == 1)) await ExecutarUm(tarefa, itens, parar);
    }

    bool Migrado(ItemAgendado item) => tarefas.Any(t => t.Tipo == item.Tipo);

    async Task ExecutarEmLotes(ITarefaAgendada tarefa, List<ItemAgendado> itens, CancellationToken parar)
    {
        foreach (var lote in itens.Where(i => i.Tipo == tarefa.Tipo).Chunk(tarefa.Lote))
        {
            parar.ThrowIfCancellationRequested();
            using var escopo = escopos.CreateScope();
            await tarefa.Executar(escopo.ServiceProvider.GetRequiredService<OneDb>(), lote, relogio.GetUtcNow().UtcDateTime, parar);
        }
    }

    async Task ExecutarUm(ITarefaAgendada tarefa, List<ItemAgendado> itens, CancellationToken parar)
    {
        foreach (var item in itens.Where(i => i.Tipo == tarefa.Tipo))
        {
            parar.ThrowIfCancellationRequested();
            try
            {
                using var escopo = escopos.CreateScope();
                var db = escopo.ServiceProvider.GetRequiredService<OneDb>();
                db.InstituicaoAtual = item.InstituicaoId;
                await tarefa.Executar(db, [item], relogio.GetUtcNow().UtcDateTime, parar);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogError(e, "Agendador falhou no item {Tipo} {ItemId} da instituição {InstituicaoId}", item.Tipo, item.Id, item.InstituicaoId);
            }
        }
    }
    async Task Despachar(OneDb db, IServiceProvider sp, ItemAgendado item, DateTime agora, CancellationToken parar)
    {
        switch (item.Tipo)
        {
            case "conversa": await Abandonar(db, item.Id, agora); break;
        }
    }

    async Task Abandonar(OneDb db, long id, DateTime agora)
    {
        var limite = agora - prazos.Abandono;
        var n = await db.Conversas.Where(c => c.Id == id && c.Desfecho == null && c.UltimaMensagemEm <= limite)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.Desfecho, Desfechos.Abandonada).SetProperty(c => c.DesfechoEm, agora));
        if (n == 1) log.LogInformation("Conversa {ConversaId} abandonada (instituição {InstituicaoId})", id, db.InstituicaoAtual);
    }
}

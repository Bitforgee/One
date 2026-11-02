using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Dados.EstadosChamado;

namespace One.Api;

// door 12: um laço para todas as instituições; cada item é gravado na instituição dele, numa transação própria.
public class Agendador(IServiceScopeFactory escopos, TimeProvider relogio, IConfiguration cfg, ILogger<Agendador> log) : BackgroundService
{
    public record Item(string Tipo, long Id, long InstituicaoId);

    TimeSpan Abandono => TimeSpan.FromMinutes(cfg.GetValue("Prazos:AbandonoMinutos", 30));
    TimeSpan Confirmacao => TimeSpan.FromDays(cfg.GetValue("Prazos:ConfirmacaoDias", 7));
    const int MaxTentativas = 5;

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

    public async Task Executar(CancellationToken parar = default) => await Processar(await Ler(), parar);

    // Leitura dos candidatos de todas as instituições; a gravação reconfere a condição de cada um (AC 120).
    public async Task<List<Item>> Ler()
    {
        using var escopo = escopos.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<OneDb>();
        var agora = relogio.GetUtcNow().UtcDateTime;
        var (limiteConversa, limiteChamado) = (agora - Abandono, agora - Confirmacao);
        var itens = await db.Conversas.IgnoreQueryFilters().Where(c => c.Desfecho == null && c.UltimaMensagemEm <= limiteConversa)
            .Select(c => new Item("conversa", c.Id, c.InstituicaoId)).ToListAsync();
        itens.AddRange(await db.Chamados.IgnoreQueryFilters().Where(c => c.Estado == Resolvido && c.ResolvidoEm <= limiteChamado)
            .Select(c => new Item("chamado", c.Id, c.InstituicaoId)).ToListAsync());
        itens.AddRange(await db.EmailsSaida.IgnoreQueryFilters().Where(e => e.EnviadoEm == null && e.Tentativas < MaxTentativas && e.ProximaTentativa <= agora)
            .Select(e => new Item("email", e.Id, e.InstituicaoId)).ToListAsync());
        return itens;
    }

    public async Task Processar(List<Item> itens, CancellationToken parar = default)
    {
        foreach (var item in itens)
        {
            parar.ThrowIfCancellationRequested();
            try
            {
                using var escopo = escopos.CreateScope();
                var db = escopo.ServiceProvider.GetRequiredService<OneDb>();
                db.InstituicaoAtual = item.InstituicaoId;
                var agora = relogio.GetUtcNow().UtcDateTime;
                switch (item.Tipo)
                {
                    case "conversa": await Abandonar(db, item.Id, agora); break;
                    case "chamado": await FecharResolvido(db, item.Id, agora); break;
                    case "email": await Enviar(db, escopo.ServiceProvider.GetRequiredService<Email>(), item.Id, agora); break;
                }
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogError(e, "Agendador falhou no item {Tipo} {ItemId} da instituição {InstituicaoId}", item.Tipo, item.Id, item.InstituicaoId);
            }
        }
    }

    // AC 118
    async Task Abandonar(OneDb db, long id, DateTime agora)
    {
        var limite = agora - Abandono;
        var n = await db.Conversas.Where(c => c.Id == id && c.Desfecho == null && c.UltimaMensagemEm <= limite)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.Desfecho, Desfechos.Abandonada).SetProperty(c => c.DesfechoEm, agora));
        if (n == 1) log.LogInformation("Conversa {ConversaId} abandonada (instituição {InstituicaoId})", id, db.InstituicaoAtual);
    }

    // AC 119: só fecha se continua RESOLVIDO e vencido no momento da gravação.
    async Task FecharResolvido(OneDb db, long id, DateTime agora)
    {
        var limite = agora - Confirmacao;
        await using var tx = await db.Database.BeginTransactionAsync();
        var n = await db.Chamados.Where(c => c.Id == id && c.Estado == Resolvido && c.ResolvidoEm <= limite)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.Estado, Fechado).SetProperty(c => c.MotivoFechamento, "FECHADO_AUTOMATICAMENTE").SetProperty(c => c.FechadoEm, agora));
        if (n == 0) return;
        db.EventosChamado.Add(new EventoChamado { ChamadoId = id, Tipo = "TRANSICAO", De = Resolvido, Para = Fechado, Detalhe = "Fechado automaticamente: 7 dias sem confirmação", CriadoEm = agora });
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        log.LogInformation("Chamado {ChamadoId} fechado automaticamente (instituição {InstituicaoId})", id, db.InstituicaoAtual);
    }

    // door 11 e AC 126: remetente com o nome da instituição do e-mail; falha soma tentativa e espera 2^n minutos.
    async Task Enviar(OneDb db, Email email, long id, DateTime agora)
    {
        var e = await db.EmailsSaida.SingleAsync(x => x.Id == id);
        var instituicao = await db.Instituicoes.SingleAsync(i => i.Id == e.InstituicaoId);
        try
        {
            await email.Enviar(instituicao.Nome, e.Destinatario, e.Assunto, e.Corpo);
            e.EnviadoEm = agora;
        }
        catch (Exception falha)
        {
            e.Tentativas++;
            e.ProximaTentativa = agora.AddMinutes(Math.Pow(2, e.Tentativas));
            if (e.Tentativas >= MaxTentativas) log.LogError(falha, "Desistência do e-mail {EmailId} da instituição {InstituicaoId} após {Tentativas} tentativas", id, e.InstituicaoId, e.Tentativas);
            else log.LogWarning(falha, "Falha ao enviar o e-mail {EmailId} da instituição {InstituicaoId}, tentativa {Tentativas}", id, e.InstituicaoId, e.Tentativas);
        }
        await db.SaveChangesAsync();
    }
}

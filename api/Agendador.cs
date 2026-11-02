using Microsoft.EntityFrameworkCore;
using One.Api.Assistente;
using One.Api.Chamados;
using Pgvector;
using One.Api.Dados;
using static One.Api.Dados.EstadosChamado;

namespace One.Api;

// door 12: um laço para todas as instituições; cada item é gravado na instituição dele, numa transação própria.
public class Agendador(IServiceScopeFactory escopos, TimeProvider relogio, IConfiguration cfg, ILogger<Agendador> log) : BackgroundService
{
    public record Item(string Tipo, long Id, long InstituicaoId);

    TimeSpan Abandono => TimeSpan.FromMinutes(cfg.GetValue("Prazos:AbandonoMinutos", 30));
    TimeSpan Confirmacao => TimeSpan.FromDays(cfg.GetValue("Prazos:ConfirmacaoDias", 7));
    TimeSpan Lembrete => TimeSpan.FromDays(cfg.GetValue("Prazos:LembreteAguardandoDias", 3));
    TimeSpan ResolverAguardando => TimeSpan.FromDays(cfg.GetValue("Prazos:ResolverAguardandoDias", 7));
    public const string TextoSemResposta = "Encerrado por falta de resposta. Se ainda precisar, rejeite esta resolução.";
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
        var (limiteResolver, limiteLembrete) = (agora - ResolverAguardando, agora - Lembrete);
        itens.AddRange(await db.Chamados.IgnoreQueryFilters().Where(c => c.Estado == AguardandoAluno && c.AguardandoDesde <= limiteResolver)
            .Select(c => new Item("aguardando", c.Id, c.InstituicaoId)).ToListAsync());
        itens.AddRange(await db.Chamados.IgnoreQueryFilters().Where(c => c.Estado == AguardandoAluno && c.LembreteEm == null && c.AguardandoDesde <= limiteLembrete && c.AguardandoDesde > limiteResolver)
            .Select(c => new Item("lembrete", c.Id, c.InstituicaoId)).ToListAsync());
        itens.AddRange(await db.EmailsSaida.IgnoreQueryFilters().Where(e => e.EnviadoEm == null && e.Tentativas < MaxTentativas && e.ProximaTentativa <= agora)
            .Select(e => new Item("email", e.Id, e.InstituicaoId)).ToListAsync());
        // RAG, AC 5: trechos de fonte sem embedding, de todas as instituições
        itens.AddRange(await db.TrechosFonte.IgnoreQueryFilters().Where(t => t.Embedding == null && t.Tentativas < MaxTentativas && t.ProximaTentativa <= agora)
            .OrderBy(t => t.Id).Select(t => new Item("trecho", t.Id, t.InstituicaoId)).ToListAsync());
        return itens;
    }

    public async Task Processar(List<Item> itens, CancellationToken parar = default)
    {
        foreach (var lote in itens.Where(i => i.Tipo == "trecho").Chunk(Embeddings.Lote))
        {
            parar.ThrowIfCancellationRequested();
            await Indexar(lote);
        }
        foreach (var item in itens.Where(i => i.Tipo != "trecho"))
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
                    case "lembrete": await Lembrar(db, item.Id, agora); break;
                    case "aguardando": await ResolverSemResposta(db, item.Id, agora); break;
                    case "email": await Enviar(db, escopo.ServiceProvider.GetRequiredService<Email>(), item.Id, agora); break;
                }
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogError(e, "Agendador falhou no item {Tipo} {ItemId} da instituição {InstituicaoId}", item.Tipo, item.Id, item.InstituicaoId);
            }
        }
    }

    // RAG, AC 5 e AC 6: um lote de até 100 trechos (de várias instituições) por chamada; a falha soma tentativa e espera 2^n minutos.
    // O embedding só é gravado num trecho que ainda não tem (o trigger recusa trocar um embedding existente).
    async Task Indexar(Item[] lote)
    {
        using var escopo = escopos.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<OneDb>();
        var ids = lote.Select(i => i.Id).ToList();
        var trechos = await db.TrechosFonte.IgnoreQueryFilters().Where(t => ids.Contains(t.Id) && t.Embedding == null).OrderBy(t => t.Id)
            .Select(t => new { t.Id, t.Texto, t.InstituicaoId, t.Tentativas }).ToListAsync();
        if (trechos.Count == 0) return;
        var agora = relogio.GetUtcNow().UtcDateTime;
        try
        {
            var vetores = await escopo.ServiceProvider.GetRequiredService<Embeddings>().Gerar(trechos.Select(t => t.Texto).ToList());
            for (var i = 0; i < trechos.Count; i++)
            {
                var (id, vetor) = (trechos[i].Id, new Vector(vetores[i]));
                await db.TrechosFonte.IgnoreQueryFilters().Where(t => t.Id == id && t.Embedding == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(t => t.Embedding, vetor));
            }
            log.LogInformation("Agendador indexou {Quantidade} trechos de fonte", trechos.Count);
        }
        catch (Exception falha) // status, rede, 20 s ou formato: tudo conta como tentativa
        {
            foreach (var t in trechos)
            {
                var tentativas = t.Tentativas + 1;
                await db.TrechosFonte.IgnoreQueryFilters().Where(x => x.Id == t.Id && x.Embedding == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.Tentativas, tentativas).SetProperty(x => x.ProximaTentativa, agora.AddMinutes(Math.Pow(2, tentativas))));
            }
            foreach (var instituicao in trechos.GroupBy(t => t.InstituicaoId))
                log.LogWarning(falha, "Falha ao gerar embeddings de {Quantidade} trechos da instituição {InstituicaoId}, tentativa {Tentativas}",
                    instituicao.Count(), instituicao.Key, instituicao.Max(t => t.Tentativas) + 1);
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

    // AC 145: um único lembrete por período em AGUARDANDO_ALUNO
    async Task Lembrar(OneDb db, long id, DateTime agora)
    {
        var limite = agora - Lembrete;
        await using var tx = await db.Database.BeginTransactionAsync();
        var n = await db.Chamados.Where(c => c.Id == id && c.Estado == AguardandoAluno && c.LembreteEm == null && c.AguardandoDesde <= limite)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.LembreteEm, agora));
        if (n == 0) return;
        var chamado = await db.Chamados.SingleAsync(c => c.Id == id);
        await Avisos.AguardaResposta(db, cfg, await db.Instituicoes.SingleAsync(i => i.Id == chamado.InstituicaoId), chamado, agora);
        db.EventosChamado.Add(new EventoChamado { ChamadoId = id, Tipo = "LEMBRETE", Detalhe = "Lembrete ao aluno: 3 dias aguardando resposta", CriadoEm = agora });
        await db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    // AC 146: depois de 7 dias sem resposta o Sistema resolve; daí em diante valem a rejeição e o fechamento automático
    async Task ResolverSemResposta(OneDb db, long id, DateTime agora)
    {
        var limite = agora - ResolverAguardando;
        await using var tx = await db.Database.BeginTransactionAsync();
        var n = await db.Chamados.Where(c => c.Id == id && c.Estado == AguardandoAluno && c.AguardandoDesde <= limite)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.Estado, Resolvido).SetProperty(c => c.ResolvidoEm, agora).SetProperty(c => c.AguardandoDesde, (DateTime?)null));
        if (n == 0) return;
        var chamado = await db.Chamados.SingleAsync(c => c.Id == id);
        db.MensagensChamado.Add(new MensagemChamado { ChamadoId = id, Tipo = "PUBLICA", Texto = TextoSemResposta, CriadaEm = agora });
        db.EventosChamado.Add(new EventoChamado { ChamadoId = id, Tipo = "TRANSICAO", De = AguardandoAluno, Para = Resolvido, CriadoEm = agora });
        await Avisos.Resolvido(db, cfg, await db.Instituicoes.SingleAsync(i => i.Id == chamado.InstituicaoId), chamado, TextoSemResposta, agora);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
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

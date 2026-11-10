using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using One.Api.Assistente;
using One.Api.Chamados;
using One.Api.Instituicoes;
using Pgvector;
using Lib.Net.Http.WebPush;
using One.Api.Dados;
using One.Api.Dados.Fluxos;
using static One.Api.Dados.EstadosChamado;

namespace One.Api;

public class Agendador(IServiceScopeFactory escopos, TimeProvider relogio, IConfiguration cfg, Prazos prazos, ILogger<Agendador> log) : BackgroundService
{
    public record Item(string Tipo, long Id, long InstituicaoId);

    public const string TextoSemResposta = "Encerrado por falta de resposta. Se ainda precisar, rejeite esta resolução.";
    const int MaxTentativas = 5;
    static readonly TimeSpan LimiteDoPush = TimeSpan.FromSeconds(30);

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

    public async Task<List<Item>> Ler()
    {
        using var escopo = escopos.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<OneDb>();
        var agora = relogio.GetUtcNow().UtcDateTime;
        var itens = await LerAtendimento(db, agora);
        itens.AddRange(await LerFilas(db, agora));
        return itens;
    }

    async Task<List<Item>> LerAtendimento(OneDb db, DateTime agora)
    {
        var (limiteConversa, limiteChamado) = (agora - prazos.Abandono, agora - prazos.Confirmacao);
        var itens = await db.Conversas.IgnoreQueryFilters().Where(c => c.Desfecho == null && c.UltimaMensagemEm <= limiteConversa)
            .Select(c => new Item("conversa", c.Id, c.InstituicaoId)).ToListAsync();
        itens.AddRange(await db.Chamados.IgnoreQueryFilters().Where(c => c.Estado == Resolvido && c.ResolvidoEm <= limiteChamado)
            .Select(c => new Item("chamado", c.Id, c.InstituicaoId)).ToListAsync());
        var (limiteResolver, limiteLembrete) = (agora - prazos.ResolverAguardando, agora - prazos.Lembrete);
        itens.AddRange(await db.Chamados.IgnoreQueryFilters().Where(c => c.Estado == AguardandoAluno && c.AguardandoDesde <= limiteResolver)
            .Select(c => new Item("aguardando", c.Id, c.InstituicaoId)).ToListAsync());
        itens.AddRange(await db.Chamados.IgnoreQueryFilters().Where(c => c.Estado == AguardandoAluno && c.LembreteEm == null && c.AguardandoDesde <= limiteLembrete && c.AguardandoDesde > limiteResolver)
            .Select(c => new Item("lembrete", c.Id, c.InstituicaoId)).ToListAsync());
        itens.AddRange(await VenceuOPrazo(db, db.Chamados.IgnoreQueryFilters(), agora).Select(c => new Item("subir", c.Id, c.InstituicaoId)).ToListAsync());
        return itens;
    }

    static IQueryable<Chamado> VenceuOPrazo(OneDb db, IQueryable<Chamado> chamados, DateTime agora) =>
        chamados.Where(EmFluxoEAberto).Where(PrazoDaEtapaVencido(db, agora)).Where(SemRespostaDaEquipe(db));

    static readonly Expression<Func<Chamado, bool>> EmFluxoEAberto = c => (c.Estado == Aberto || c.Estado == EmAtendimento) && c.EtapaOrdem != null;

    static Expression<Func<Chamado, bool>> PrazoDaEtapaVencido(OneDb db, DateTime agora) => c =>
        db.EtapasFluxo.IgnoreQueryFilters().Any(e => e.VersaoFluxoId == c.VersaoFluxoId && e.Ordem == c.EtapaOrdem && e.PrazoHoras != null
            && c.EtapaDesde!.Value.AddHours(e.PrazoHoras.Value) <= agora);

    static Expression<Func<Chamado, bool>> SemRespostaDaEquipe(OneDb db) => c =>
        !db.MensagensChamado.IgnoreQueryFilters().Any(m => m.ChamadoId == c.Id && m.Tipo == TiposMensagem.Publica && m.AutorId != null && m.AutorId != c.SolicitanteId && m.CriadaEm >= c.EtapaDesde);

    async Task<List<Item>> LerFilas(OneDb db, DateTime agora)
    {
        var itens = await db.EmailsSaida.IgnoreQueryFilters().Where(e => e.EnviadoEm == null && e.Tentativas < MaxTentativas && e.ProximaTentativa <= agora)
            .Select(e => new Item("email", e.Id, e.InstituicaoId)).ToListAsync();
        itens.AddRange(await db.TrechosFonte.IgnoreQueryFilters().Where(t => t.Embedding == null && t.Tentativas < MaxTentativas && t.ProximaTentativa <= agora)
            .OrderBy(t => t.Id).Select(t => new Item("trecho", t.Id, t.InstituicaoId)).ToListAsync());
        itens.AddRange(await db.PushesSaida.IgnoreQueryFilters().Where(p => p.EnviadoEm == null && p.Tentativas < MaxTentativas && p.ProximaTentativa <= agora
                && db.SubscricoesPush.IgnoreQueryFilters().Any(s => s.Id == p.SubscricaoId && s.InstituicaoId == p.InstituicaoId))
            .Select(p => new Item("push", p.Id, p.InstituicaoId)).ToListAsync());
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
                await Despachar(db, escopo.ServiceProvider, item, relogio.GetUtcNow().UtcDateTime, parar);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogError(e, "Agendador falhou no item {Tipo} {ItemId} da instituição {InstituicaoId}", item.Tipo, item.Id, item.InstituicaoId);
            }
        }
    }

    async Task Despachar(OneDb db, IServiceProvider sp, Item item, DateTime agora, CancellationToken parar)
    {
        switch (item.Tipo)
        {
            case "conversa": await Abandonar(db, item.Id, agora); break;
            case "chamado": await FecharResolvido(db, item.Id, agora); break;
            case "lembrete": await Lembrar(db, item.Id, agora); break;
            case "aguardando": await ResolverSemResposta(db, item.Id, agora); break;
            case "subir": await SubirPorPrazo(db, item.Id, agora); break;
            case "email": await Enviar(db, sp.GetRequiredService<Email>(), item.Id, agora); break;
            case "push": await EnviarPush(db, sp.GetRequiredService<IEnviadorPush>(), item.Id, agora, parar); break;
        }
    }

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
        catch (Exception falha)
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

    async Task Abandonar(OneDb db, long id, DateTime agora)
    {
        var limite = agora - prazos.Abandono;
        var n = await db.Conversas.Where(c => c.Id == id && c.Desfecho == null && c.UltimaMensagemEm <= limite)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.Desfecho, Desfechos.Abandonada).SetProperty(c => c.DesfechoEm, agora));
        if (n == 1) log.LogInformation("Conversa {ConversaId} abandonada (instituição {InstituicaoId})", id, db.InstituicaoAtual);
    }

    async Task FecharResolvido(OneDb db, long id, DateTime agora)
    {
        var limite = agora - prazos.Confirmacao;
        await using var tx = await db.Database.BeginTransactionAsync();
        var n = await db.Chamados.Where(c => c.Id == id && c.Estado == Resolvido && c.ResolvidoEm <= limite)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.Estado, Fechado).SetProperty(c => c.MotivoFechamento, MotivosFechamento.FechadoAutomaticamente).SetProperty(c => c.FechadoEm, agora));
        if (n == 0) return;
        db.EventosChamado.Add(new EventoChamado { ChamadoId = id, Tipo = TiposEvento.Transicao, De = Resolvido, Para = Fechado, Detalhe = $"Fechado automaticamente: {prazos.ConfirmacaoDias} dias sem confirmação", CriadoEm = agora });
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        log.LogInformation("Chamado {ChamadoId} fechado automaticamente (instituição {InstituicaoId})", id, db.InstituicaoAtual);
    }

    async Task Lembrar(OneDb db, long id, DateTime agora)
    {
        var limite = agora - prazos.Lembrete;
        await using var tx = await db.Database.BeginTransactionAsync();
        var n = await db.Chamados.Where(c => c.Id == id && c.Estado == AguardandoAluno && c.LembreteEm == null && c.AguardandoDesde <= limite)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.LembreteEm, agora));
        if (n == 0) return;
        var chamado = await db.Chamados.SingleAsync(c => c.Id == id);
        await Avisos.AguardaResposta(db, cfg, await db.Instituicoes.SingleAsync(i => i.Id == chamado.InstituicaoId), chamado, agora);
        db.EventosChamado.Add(new EventoChamado { ChamadoId = id, Tipo = TiposEvento.Lembrete, Detalhe = $"Lembrete ao aluno: {prazos.LembreteAguardandoDias} dias aguardando resposta", CriadoEm = agora });
        await db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    async Task ResolverSemResposta(OneDb db, long id, DateTime agora)
    {
        var limite = agora - prazos.ResolverAguardando;
        await using var tx = await db.Database.BeginTransactionAsync();
        var n = await db.Chamados.Where(c => c.Id == id && c.Estado == AguardandoAluno && c.AguardandoDesde <= limite)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.Estado, Resolvido).SetProperty(c => c.ResolvidoEm, agora).SetProperty(c => c.AguardandoDesde, (DateTime?)null));
        if (n == 0) return;
        var chamado = await db.Chamados.SingleAsync(c => c.Id == id);
        db.MensagensChamado.Add(new MensagemChamado { ChamadoId = id, Tipo = TiposMensagem.Publica, Texto = TextoSemResposta, CriadaEm = agora });
        db.EventosChamado.Add(new EventoChamado { ChamadoId = id, Tipo = TiposEvento.Transicao, De = AguardandoAluno, Para = Resolvido, CriadoEm = agora });
        await Avisos.Resolvido(db, cfg, prazos, await db.Instituicoes.SingleAsync(i => i.Id == chamado.InstituicaoId), chamado, TextoSemResposta, agora);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    async Task SubirPorPrazo(OneDb db, long id, DateTime agora)
    {
        var chamado = await VenceuOPrazo(db, db.Chamados, agora).SingleOrDefaultAsync(c => c.Id == id);
        if (chamado is null || await ResolverFluxo.Seguinte(db, chamado) is not { } passo) return;
        var horas = await db.EtapasFluxo.Where(e => e.VersaoFluxoId == chamado.VersaoFluxoId && e.Ordem == chamado.EtapaOrdem).Select(e => e.PrazoHoras).SingleAsync();
        var nomes = await db.Setores.Where(s => s.Id == chamado.SetorId || s.Id == passo.SetorId).ToDictionaryAsync(s => s.Id, s => s.Nome);
        chamado.Subir(null, nomes[chamado.SetorId], nomes[passo.SetorId], passo.SetorId, passo.Etapa.Ordem, $"Sem resposta em {horas} horas", await AcoesChamado.NomeDoResponsavel(db, chamado), agora);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException) { return; }
        log.LogInformation("Chamado {ChamadoId} subiu para a etapa {Etapa} por prazo (instituição {InstituicaoId})", id, passo.Etapa.Ordem, db.InstituicaoAtual);
    }

    async Task Enviar(OneDb db, Email email, long id, DateTime agora)
    {
        var e = await db.EmailsSaida.SingleAsync(x => x.Id == id);
        var instituicao = await db.Instituicoes.SingleAsync(i => i.Id == e.InstituicaoId);
        try
        {
            await email.Enviar(db, instituicao, e.Destinatario, e.Assunto, e.Corpo);
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

    record DoChamado(string Numero, string Estado);
    record DaInstituicao(string Slug, string Titulo);

    async Task EnviarPush(OneDb db, IEnviadorPush envio, long id, DateTime agora, CancellationToken parar)
    {
        var p = await db.PushesSaida.SingleOrDefaultAsync(x => x.Id == id && x.EnviadoEm == null && x.Tentativas < MaxTentativas);
        var s = p is null ? null : await db.SubscricoesPush.SingleOrDefaultAsync(x => x.Id == p.SubscricaoId);
        if (p is null || s is null) return;
        var chamado = await db.Chamados.Where(c => c.Id == p.ChamadoId).Select(c => new DoChamado(c.Numero, c.Estado)).SingleAsync();
        var inst = await db.Instituicoes.Where(i => i.Id == p.InstituicaoId).Select(i => new DaInstituicao(i.Slug, i.NomeCurto ?? i.Nome)).SingleAsync();
        var icone = await db.ImagensInstituicao.Where(x => x.Tipo == TiposDeImagem.Icone && x.RemovidaEm == null).Select(x => (int?)x.Versao).FirstOrDefaultAsync();
        using var prazo = new CancellationTokenSource(LimiteDoPush, relogio);
        using var junto = CancellationTokenSource.CreateLinkedTokenSource(parar, prazo.Token);
        try
        {
            await envio.Enviar(s.Endpoint, s.P256dh, s.Auth, PayloadPush.De(inst.Slug, chamado.Numero, inst.Titulo, chamado.Estado, icone), junto.Token);
            p.Concluir(agora);
        }
        catch (PushServiceClientException e) when (e.StatusCode is System.Net.HttpStatusCode.NotFound or System.Net.HttpStatusCode.Gone)
        {
            db.SubscricoesPush.Remove(s);
        }
        catch (Exception falha) when (!parar.IsCancellationRequested)
        {
            p.RegistrarFalha(agora);
            if (p.Tentativas >= MaxTentativas) log.LogError(falha, "Desistência do push {PushId} da instituição {InstituicaoId} após {Tentativas} tentativas", id, p.InstituicaoId, p.Tentativas);
            else log.LogWarning(falha, "Falha ao enviar o push {PushId} da instituição {InstituicaoId}, tentativa {Tentativas}", id, p.InstituicaoId, p.Tentativas);
        }
        await db.SaveChangesAsync();
    }
}

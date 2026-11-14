using System.Data.Common;
using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace One.Api.Chamados.TempoReal;

public sealed class AvisarMudanca(IHubContext<TempoRealHub> hub, ILogger<AvisarMudanca> log) : SaveChangesInterceptor, IDbTransactionInterceptor
{
    sealed class Estado
    {
        public List<ToqueNoChamado> Salvando = [];
        public List<AvisoDeMudanca> Pendentes = [];
    }

    readonly ConditionalWeakTable<DbContext, Estado> estados = new();
    readonly AvisoAoHub aviso = new(hub, log);

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        estados.GetOrCreateValue(eventData.Context!).Salvando = [.. eventData.Context!.ChangeTracker.Entries().Select(ColetaDeMudancas.Tocar).OfType<ToqueNoChamado>()];
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override async ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        var db = eventData.Context!;
        var estado = estados.GetOrCreateValue(db);
        var toques = estado.Salvando;
        estado.Salvando = [];
        var avisos = await ColetaDeMudancas.Resolver(db, toques);
        if (db.Database.CurrentTransaction is null) await aviso.Enviar(avisos);
        else estado.Pendentes.AddRange(avisos);
        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        estados.GetOrCreateValue(eventData.Context!).Salvando = [];
        return base.SaveChangesFailedAsync(eventData, cancellationToken);
    }

    public async Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is null || !estados.TryGetValue(eventData.Context, out var estado) || estado.Pendentes.Count == 0) return;
        var avisos = estado.Pendentes;
        estado.Pendentes = [];
        await aviso.Enviar(avisos);
    }

    public Task TransactionRolledBackAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null && estados.TryGetValue(eventData.Context, out var estado)) estado.Pendentes = [];
        return Task.CompletedTask;
    }

    sealed class AvisoAoHub(IHubContext<TempoRealHub> hub, ILogger log)
    {
        public async Task Enviar(List<AvisoDeMudanca> avisos)
        {
            foreach (var a in avisos)
            {
                try
                {
                    await hub.Clients.Group(TempoRealGrupos.Chamado(a.InstituicaoId, a.Numero)).SendAsync("ChamadoMudou", a.Numero);
                    foreach (var setorId in new[] { a.SetorId, a.SetorAntigoId ?? a.SetorId }.Distinct())
                        await hub.Clients.Group(TempoRealGrupos.Fila(a.InstituicaoId, setorId)).SendAsync("FilaMudou");
                }
                catch (Exception e) when (e is not OperationCanceledException)
                {
                    log.LogWarning("Falha ao avisar a mudança do chamado {ChamadoId} da instituição {InstituicaoId}: {Tipo}", a.ChamadoId, a.InstituicaoId, e.GetType().Name);
                }
            }
        }
    }
}

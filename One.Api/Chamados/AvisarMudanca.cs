using System.Data.Common;
using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using One.Api.Dados;

namespace One.Api.Chamados;

// Door 4: depois de cada gravação confirmada que toca Chamado, MensagemChamado ou EventoChamado, avisa o grupo do chamado e as filas dos setores.
// Com transação explícita o envio espera o commit.
// shortcut: só os SaveChangesAsync avisam (a API não usa o síncrono), acrescentar o par síncrono se um dia usar.
public sealed class AvisarMudanca(IHubContext<TempoRealHub> hub, ILogger<AvisarMudanca> log) : SaveChangesInterceptor, IDbTransactionInterceptor
{
    record Aviso(long ChamadoId, long InstituicaoId, string Numero, long SetorId, long? SetorAntigoId);
    record Toque(Chamado? Chamado, Func<long>? ChamadoIdDoFilho, long? SetorAntigoId);

    sealed class Estado
    {
        public List<Toque> Salvando = [];
        public List<Aviso> Pendentes = [];
    }

    readonly ConditionalWeakTable<DbContext, Estado> estados = new();

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        estados.GetOrCreateValue(eventData.Context!).Salvando = [.. eventData.Context!.ChangeTracker.Entries().Select(Tocar).OfType<Toque>()];
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    static Toque? Tocar(EntityEntry e) => (e.Entity, e.State) switch
    {
        (Chamado c, EntityState.Added) => new Toque(c, null, null),
        (Chamado c, EntityState.Modified) => new Toque(c, null, e.OriginalValues.GetValue<long>(nameof(Chamado.SetorId)) is var antigo && antigo != c.SetorId ? antigo : null),
        (MensagemChamado m, EntityState.Added) => new Toque(null, () => m.ChamadoId, null),
        (EventoChamado v, EntityState.Added) => new Toque(null, () => v.ChamadoId, null),
        _ => null,
    };

    // A chave estrangeira do filho só está preenchida depois da gravação, por isso o Toque guarda a leitura dela.

    public override async ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        var db = eventData.Context!;
        var estado = estados.GetOrCreateValue(db);
        var toques = estado.Salvando;
        estado.Salvando = [];
        var avisos = await Resolver(db, toques);
        if (db.Database.CurrentTransaction is null) await Enviar(avisos);
        else estado.Pendentes.AddRange(avisos);
        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        estados.GetOrCreateValue(eventData.Context!).Salvando = [];
        return base.SaveChangesFailedAsync(eventData, cancellationToken);
    }

    static async Task<List<Aviso>> Resolver(DbContext db, List<Toque> toques)
    {
        var avisos = toques.Where(t => t.Chamado is not null).Select(t => new Aviso(t.Chamado!.Id, t.Chamado.InstituicaoId, t.Chamado.Numero, t.Chamado.SetorId, t.SetorAntigoId)).ToList();
        var faltam = toques.Where(t => t.Chamado is null).Select(t => t.ChamadoIdDoFilho!()).Except(avisos.Select(a => a.ChamadoId)).Distinct().ToList();
        if (faltam.Count > 0)
            avisos.AddRange(await db.Set<Chamado>().AsNoTracking().Where(c => faltam.Contains(c.Id))
                .Select(c => new Aviso(c.Id, c.InstituicaoId, c.Numero, c.SetorId, null)).ToListAsync());
        return [.. avisos.GroupBy(a => a.ChamadoId).Select(g => g.OrderByDescending(a => a.SetorAntigoId).First())];
    }

    async Task Enviar(List<Aviso> avisos)
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

    public async Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is null || !estados.TryGetValue(eventData.Context, out var estado) || estado.Pendentes.Count == 0) return;
        var avisos = estado.Pendentes;
        estado.Pendentes = [];
        await Enviar(avisos);
    }

    public Task TransactionRolledBackAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null && estados.TryGetValue(eventData.Context, out var estado)) estado.Pendentes = [];
        return Task.CompletedTask;
    }
}

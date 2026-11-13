using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using One.Api.Dados;

namespace One.Api.Chamados;

public sealed record AvisoDeMudanca(long ChamadoId, long InstituicaoId, string Numero, long SetorId, long? SetorAntigoId);

public sealed record ToqueNoChamado(Chamado? Chamado, Func<long>? ChamadoIdDoFilho, long? SetorAntigoId);

public static class ColetaDeMudancas
{
    public static ToqueNoChamado? Tocar(EntityEntry e) => (e.Entity, e.State) switch
    {
        (Chamado c, EntityState.Added) => new ToqueNoChamado(c, null, null),
        (Chamado c, EntityState.Modified) => new ToqueNoChamado(c, null, e.OriginalValues.GetValue<long>(nameof(Chamado.SetorId)) is var antigo && antigo != c.SetorId ? antigo : null),
        (MensagemChamado m, EntityState.Added) => new ToqueNoChamado(null, () => m.ChamadoId, null),
        (EventoChamado v, EntityState.Added) => new ToqueNoChamado(null, () => v.ChamadoId, null),
        _ => null,
    };

    public static async Task<List<AvisoDeMudanca>> Resolver(DbContext db, List<ToqueNoChamado> toques)
    {
        var avisos = toques.Where(t => t.Chamado is not null).Select(t => new AvisoDeMudanca(t.Chamado!.Id, t.Chamado.InstituicaoId, t.Chamado.Numero, t.Chamado.SetorId, t.SetorAntigoId)).ToList();
        var faltam = toques.Where(t => t.Chamado is null).Select(t => t.ChamadoIdDoFilho!()).Except(avisos.Select(a => a.ChamadoId)).Distinct().ToList();
        if (faltam.Count > 0)
            avisos.AddRange(await db.Set<Chamado>().AsNoTracking().Where(c => faltam.Contains(c.Id))
                .Select(c => new AvisoDeMudanca(c.Id, c.InstituicaoId, c.Numero, c.SetorId, null)).ToListAsync());
        return [.. avisos.GroupBy(a => a.ChamadoId).Select(g => g.OrderByDescending(a => a.SetorAntigoId).First())];
    }
}

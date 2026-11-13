using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Chamados;

public sealed class ResolverSemResposta(IConfiguration cfg, Prazos prazos) : ITarefaAgendada
{
    public string Tipo => "aguardando";

    public Task<List<ItemAgendado>> Ler(OneDb db, DateTime agora)
    {
        var limite = agora - prazos.ResolverAguardando;
        return db.Chamados.IgnoreQueryFilters().Where(c => c.Estado == AguardandoAluno && c.AguardandoDesde <= limite)
            .Select(c => new ItemAgendado("aguardando", c.Id, c.InstituicaoId)).ToListAsync();
    }

    public async Task Executar(OneDb db, IReadOnlyList<ItemAgendado> itens, DateTime agora, CancellationToken parar)
    {
        var id = itens[0].Id;
        var chamado = await db.Chamados.SingleOrDefaultAsync(c => c.Id == id);
        if (chamado is null || chamado.ResolverPorFaltaDeResposta(prazos.ResolverAguardandoDias, agora) is not null) return;
        await Avisos.Resolvido(db, cfg, prazos, await db.Instituicoes.SingleAsync(i => i.Id == chamado.InstituicaoId), chamado, Chamado.TextoSemResposta, agora);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException) { }
    }
}

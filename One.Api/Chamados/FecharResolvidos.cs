using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Chamados;

public sealed class FecharResolvidos(Prazos prazos, ILogger<FecharResolvidos> log) : ITarefaAgendada
{
    public string Tipo => "chamado";

    public Task<List<ItemAgendado>> Ler(OneDb db, DateTime agora)
    {
        var limite = agora - prazos.Confirmacao;
        return db.Chamados.IgnoreQueryFilters().Where(c => c.Estado == Resolvido && c.ResolvidoEm <= limite)
            .Select(c => new ItemAgendado("chamado", c.Id, c.InstituicaoId)).ToListAsync();
    }

    public async Task Executar(OneDb db, IReadOnlyList<ItemAgendado> itens, DateTime agora, CancellationToken parar)
    {
        var id = itens[0].Id;
        var chamado = await db.Chamados.SingleOrDefaultAsync(c => c.Id == id);
        if (chamado is null || chamado.FecharPorInatividade(prazos.ConfirmacaoDias, agora) is not null) return;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException) { return; }
        log.LogInformation("Chamado {ChamadoId} fechado automaticamente (instituição {InstituicaoId})", id, db.InstituicaoAtual);
    }
}

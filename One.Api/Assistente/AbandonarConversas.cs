using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Dados.Conversas;

namespace One.Api.Assistente;

public sealed class AbandonarConversas(Prazos prazos, ILogger<AbandonarConversas> log) : ITarefaAgendada
{
    public string Tipo => "conversa";

    public Task<List<ItemAgendado>> Ler(OneDb db, DateTime agora) =>
        db.Conversas.IgnoreQueryFilters().Where(Conversa.Abandonavel(agora - prazos.Abandono))
            .Select(c => new ItemAgendado("conversa", c.Id, c.InstituicaoId)).ToListAsync();

    public async Task Executar(OneDb db, IReadOnlyList<ItemAgendado> itens, DateTime agora, CancellationToken parar)
    {
        var id = itens[0].Id;
        var n = await db.Conversas.Where(c => c.Id == id).Where(Conversa.Abandonavel(agora - prazos.Abandono))
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.Desfecho, Desfechos.Abandonada).SetProperty(c => c.DesfechoEm, agora));
        if (n == 1) log.LogInformation("Conversa {ConversaId} abandonada (instituição {InstituicaoId})", id, db.InstituicaoAtual);
    }
}

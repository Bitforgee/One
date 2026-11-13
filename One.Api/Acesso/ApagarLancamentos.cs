using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Acesso;

public sealed class ApagarLancamentos : ITarefaAgendada
{
    public string Tipo => "lancamento";

    public Task<List<ItemAgendado>> Ler(OneDb db, DateTime agora) => Task.FromResult<List<ItemAgendado>>([]);

    public Task Executar(OneDb db, IReadOnlyList<ItemAgendado> itens, DateTime agora, CancellationToken parar) => Task.CompletedTask;

    public async Task Limpar(OneDb db, DateTime agora, CancellationToken parar)
    {
        var limite = agora - TimeSpan.FromDays(1);
        await db.LtiLancamentos.IgnoreQueryFilters().Where(l => l.ExpiraEm < limite).ExecuteDeleteAsync(parar);
    }
}

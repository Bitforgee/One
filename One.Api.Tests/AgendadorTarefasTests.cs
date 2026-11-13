using Microsoft.Extensions.DependencyInjection;
using One.Api.Acesso;
using One.Api.Assistente;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class AgendadorTarefasTests(OneFactory f) : IClassFixture<OneFactory>
{
    static readonly string[] TiposDaBase = ["conversa", "chamado", "aguardando", "lembrete", "subir", "email", "trecho", "push"];

    List<ITarefaAgendada> Registradas => [.. f.Services.GetServices<ITarefaAgendada>()];

    [Fact]
    public void Tarefas_registradas_na_ordem_da_base()
    {
        var tarefas = Registradas;

        Assert.Equal(9, tarefas.Count);
        Assert.Equal(TiposDaBase, tarefas.Where(t => t is not ApagarLancamentos).Select(t => t.Tipo));
        Assert.Single(tarefas, t => t is ApagarLancamentos);
    }

    [Fact]
    public void Cada_tarefa_mora_na_fatia_dona_e_so_o_trecho_roda_em_lote()
    {
        var tarefas = Registradas.ToDictionary(t => t.GetType().Name, t => (t.GetType().Namespace, t.Lote));

        Assert.Equal(new Dictionary<string, (string?, int)>
        {
            ["ApagarLancamentos"] = ("One.Api.Acesso", 1),
            ["AbandonarConversas"] = ("One.Api.Assistente", 1),
            ["FecharResolvidos"] = ("One.Api.Chamados", 1),
            ["ResolverSemResposta"] = ("One.Api.Chamados", 1),
            ["LembrarAguardando"] = ("One.Api.Chamados", 1),
            ["SubirPorPrazo"] = ("One.Api.Chamados", 1),
            ["EnviarEmails"] = ("One.Api.Chamados", 1),
            ["IndexarTrechos"] = ("One.Api.Assistente", Embeddings.Lote),
            ["EnviarPushes"] = ("One.Api.Chamados", 1),
        }.OrderBy(x => x.Key), tarefas.OrderBy(x => x.Key));
    }
}

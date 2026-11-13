using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class ServicosTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string Arquivo = "servicos.txt";

    static readonly string[] Adicionadas =
    [
        "Singleton One.Api.ITarefaAgendada -> One.Api.Acesso.ApagarLancamentos",
        "Singleton One.Api.ITarefaAgendada -> One.Api.Assistente.AbandonarConversas",
        "Singleton One.Api.ITarefaAgendada -> One.Api.Chamados.FecharResolvidos",
        "Singleton One.Api.ITarefaAgendada -> One.Api.Chamados.ResolverSemResposta",
        "Singleton One.Api.ITarefaAgendada -> One.Api.Chamados.LembrarAguardando",
        "Singleton One.Api.ITarefaAgendada -> One.Api.Chamados.SubirPorPrazo",
        "Singleton One.Api.ITarefaAgendada -> One.Api.Chamados.EnviarEmails",
        "Singleton One.Api.ITarefaAgendada -> One.Api.Assistente.IndexarTrechos",
        "Singleton One.Api.ITarefaAgendada -> One.Api.Chamados.EnviarPushes",
    ];

    static readonly string[] Removidas = [];

    static string Nome(Type? t) => t is null ? "fabrica" : t.IsGenericType ? t.ToString() : t.FullName!;

    static bool DoApi(ServiceDescriptor d) =>
        (d.ServiceType.Namespace?.StartsWith("One.Api") ?? false) && !d.ServiceType.Name.EndsWith("Handler", StringComparison.Ordinal);

    [Fact]
    public async Task Tempos_de_vida_iguais_ao_golden()
    {
        IServiceCollection? colecao = null;
        await using var derivada = f.WithWebHostBuilder(b => b.ConfigureTestServices(s => colecao = s));
        _ = derivada.Services;

        var servicos = colecao!.Where(DoApi).Where(d => d.ServiceType != typeof(IHostedService))
            .Select(d => $"{d.Lifetime} {Nome(d.ServiceType)} -> {Nome(d.ImplementationType)}").Distinct().Order(StringComparer.Ordinal).ToList();
        var hospedados = colecao!.Where(d => d.ServiceType == typeof(IHostedService)).Select(d => $"{d.Lifetime} {Nome(d.ImplementationType)}").ToList();
        var vivo = string.Join("\n", ["## servicos", .. servicos, "## hospedados", .. hospedados]);

        var doGolden = Dourado.Secao(Arquivo, "servicos").Split('\n', StringSplitOptions.RemoveEmptyEntries);
        var esperados = doGolden.Except(Removidas).Concat(Adicionadas).Order(StringComparer.Ordinal);
        var esperado = string.Join("\n", ["## servicos", .. esperados, "## hospedados", .. Dourado.Secao(Arquivo, "hospedados").Split('\n', StringSplitOptions.RemoveEmptyEntries)]);

        Assert.Empty(Removidas.Except(doGolden));
        Assert.Empty(Adicionadas.Intersect(doGolden));
        Dourado.Igual(Arquivo, esperado, vivo);
    }
}

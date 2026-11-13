using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class ServicosTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string Arquivo = "servicos.txt";

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

        Dourado.Igual(Arquivo, Dourado.Ler(Arquivo), vivo);
    }
}

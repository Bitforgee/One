using Microsoft.Extensions.DependencyInjection;

namespace One.Api.Instituicoes;

public static class InstituicaoComando
{
    public static Task<int> Rodar(IServiceProvider servicos, string[] args) => Executar(servicos, args, Console.Out, Console.Error);

    public static async Task<int> Executar(IServiceProvider servicos, string[] args, TextWriter saida, TextWriter erro)
    {
        using var scope = servicos.CreateScope();
        var sp = scope.ServiceProvider;
        var remover = args.Contains("--remover");
        string[] pares = [.. args.Where(a => a != "--remover")];
        var opcoes = new Dictionary<string, string>();
        for (var i = 1; i + 1 < pares.Length; i += 2)
            if (pares[i].StartsWith("--")) opcoes[pares[i][2..]] = pares[i + 1];

        var erros = args.FirstOrDefault() switch
        {
            "criar" => await ActivatorUtilities.CreateInstance<ComandoCriar>(sp).Executar(opcoes, saida),
            "carga" => await ActivatorUtilities.CreateInstance<ComandoCarga>(sp).Executar(opcoes, saida),
            "operador" => await ActivatorUtilities.CreateInstance<ComandoOperador>(sp).Executar(opcoes, remover, saida),
            _ => ["uso: instituicao criar --slug --nome --fuso --admin-cpf --admin-nome --admin-email | instituicao carga --slug --arquivo | instituicao avaliar-busca --slug --arquivo | instituicao operador --slug --cpf [--remover]"],
        };
        foreach (var e in erros) erro.WriteLine(e);
        return erros.Count == 0 ? 0 : 1;
    }
}

namespace One.Api.Tests.Infra;

public static class Dourado
{
    static string Caminho(string arquivo) => Path.Combine(ArquiteturaTests.Raiz(), "One.Api.Tests", "Retratos", arquivo);

    static string Normalizar(string texto) => texto.ReplaceLineEndings("\n").Replace("\\r\\n", "\\n").TrimEnd('\n');

    public static string Ler(string arquivo) => File.Exists(Caminho(arquivo)) ? Normalizar(File.ReadAllText(Caminho(arquivo))) : "";

    public static string Secao(string arquivo, string nome)
    {
        var linhas = Ler(arquivo).Split('\n');
        var inicio = Array.IndexOf(linhas, $"## {nome}");
        if (inicio < 0) return "";
        return string.Join("\n", linhas[(inicio + 1)..].TakeWhile(l => !l.StartsWith("## ")));
    }

    public static void Igual(string arquivo, string esperado, string vivo) =>
        Assert.True(Normalizar(esperado) == Normalizar(vivo), $"{arquivo} difere do texto vivo. Texto vivo:\n{vivo}");
}

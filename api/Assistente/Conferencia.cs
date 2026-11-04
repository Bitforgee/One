using System.Text.RegularExpressions;

namespace One.Api.Assistente;

public static partial class Conferencia
{
    static string Normalizar(string s) => Espacos().Replace(s.ToLowerInvariant(), " ");

    public static bool TrechoConfere(string? trecho, string resposta)
    {
        return trecho is { Length: >= 20 and <= 400 } && Normalizar(resposta).Contains(Normalizar(trecho).Trim(), StringComparison.Ordinal);
    }

    public static bool LinksConferem(string texto, IEnumerable<string> links)
    {
        var permitidos = links.ToHashSet();
        return Url().Matches(texto).All(m => permitidos.Contains(m.Value.TrimEnd('.', ',', ';', ':', '!', '?')));
    }

    public const int TetoTexto = 700;

    public static bool TextoDentroDoTeto(string? texto) => texto?.Trim().Length is > 0 and <= TetoTexto;

    public static bool TemLink(string texto) => Url().IsMatch(texto);

    // Cada sequência de dígitos do texto, sem zeros à esquerda, tem de existir nos textos permitidos.
    public static bool NumerosConferem(string texto, IEnumerable<string> permitidos)
    {
        var validos = permitidos.SelectMany(Numeros).ToHashSet();
        return Numeros(texto).All(validos.Contains);
    }

    static IEnumerable<string> Numeros(string s) => Digitos().Matches(s).Select(m => m.Value.TrimStart('0'));

    [GeneratedRegex(@"\d+")] private static partial Regex Digitos();
    [GeneratedRegex(@"\s+")] private static partial Regex Espacos();
    [GeneratedRegex(@"https?://[^\s<>()""']+", RegexOptions.IgnoreCase)] private static partial Regex Url();
}

public static partial class Mascara
{
    public static string Aplicar(string s) => Numero().Replace(Email().Replace(s, "[e-mail removido]"), "[número removido]");

    [GeneratedRegex(@"[^\s@]+@[^\s@]+\.[^\s@]+")] private static partial Regex Email();
    [GeneratedRegex(@"\d(?:[.\-\s]?\d){7,}")] private static partial Regex Numero();
}

using System.Text.RegularExpressions;

namespace One.Api.Assistente.Respostas;

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

    public static bool NumerosConferem(string texto, IEnumerable<string> permitidos)
    {
        if (OutroNumerico().IsMatch(texto)) return false;
        var validos = permitidos.SelectMany(Numeros).ToHashSet();
        return Numeros(texto).All(validos.Contains);
    }

    static IEnumerable<string> Numeros(string s) =>
        Digitos().Matches(s).Select(m => Grupos().Replace(m.Value, g => g.Value.TrimStart('0')));

    [GeneratedRegex(@"[0-9]+(?:[.,/][0-9]+)*")] private static partial Regex Digitos();
    [GeneratedRegex(@"[0-9]+")] private static partial Regex Grupos();
    [GeneratedRegex(@"(?![0-9])\p{N}")] private static partial Regex OutroNumerico();
    [GeneratedRegex(@"\s+")] private static partial Regex Espacos();
    [GeneratedRegex(@"https?://[^\s<>()""']+", RegexOptions.IgnoreCase)] private static partial Regex Url();
}

public static partial class Mascara
{
    public static string Aplicar(string s) => Numero().Replace(Email().Replace(s, "[e-mail removido]"), "[número removido]");

    [GeneratedRegex(@"[^\s@]+@[^\s@]+\.[^\s@]+")] private static partial Regex Email();
    [GeneratedRegex(@"\d(?:[.\-\s]?\d){7,}")] private static partial Regex Numero();
}

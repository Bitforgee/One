using System.Text.RegularExpressions;

namespace One.Api.Assistente;

// Door 19: o trecho só vale se aparece literalmente na versão citada, ignorando maiúsculas e espaços repetidos.
public static partial class Conferencia
{
    static string Normalizar(string s) => Espacos().Replace(s.ToLowerInvariant(), " ");

    public static bool TrechoConfere(string? trecho, string resposta)
    {
        // O tamanho vale para o trecho como o modelo devolveu; a busca, para os dois textos normalizados.
        return trecho is { Length: >= 20 and <= 400 } && Normalizar(resposta).Contains(Normalizar(trecho).Trim(), StringComparison.Ordinal);
    }

    public static bool LinksConferem(string texto, IEnumerable<string> links)
    {
        var permitidos = links.ToHashSet();
        return Url().Matches(texto).All(m => permitidos.Contains(m.Value.TrimEnd('.', ',', ';', ':', '!', '?')));
    }

    [GeneratedRegex(@"\s+")] private static partial Regex Espacos();
    [GeneratedRegex(@"https?://[^\s<>()""']+", RegexOptions.IgnoreCase)] private static partial Regex Url();
}

// AC 34: nada de números longos nem e-mails sai do servidor.
public static partial class Mascara
{
    public static string Aplicar(string s) => Numero().Replace(Email().Replace(s, "[e-mail removido]"), "[número removido]");

    [GeneratedRegex(@"[^\s@]+@[^\s@]+\.[^\s@]+")] private static partial Regex Email();
    [GeneratedRegex(@"\d(?:[.\-\s]?\d){7,}")] private static partial Regex Numero();
}

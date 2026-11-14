namespace One.Api.Conhecimento.Documentos;

public static class DivisorDeTexto
{
    public static List<string> Dividir(string texto, int maximo = 1500, int sobreposicao = 200)
    {
        texto = texto.Replace("\r\n", "\n").Trim();
        var trechos = new List<string>();
        var inicio = 0;
        while (inicio < texto.Length)
        {
            if (texto.Length - inicio <= maximo) { trechos.Add(texto[inicio..]); break; }
            var janela = texto.Substring(inicio, maximo);
            var corte = janela.LastIndexOf("\n\n", StringComparison.Ordinal) is var p and > 0 && p + 2 > sobreposicao ? p + 2 : -1;
            if (corte < 0)
            {
                var frase = new[] { ". ", "! ", "? ", ".\n", "!\n", "?\n" }.Max(m => janela.LastIndexOf(m, StringComparison.Ordinal));
                corte = frase >= 0 && frase + 1 > sobreposicao ? frase + 1 : maximo;
            }
            trechos.Add(janela[..corte]);
            inicio += corte - sobreposicao;
        }
        return trechos;
    }
}
